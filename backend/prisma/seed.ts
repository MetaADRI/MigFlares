import { PrismaClient, type Prisma, type RoleName, type ServiceCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

/* ===================================================================== */
/* Mig Flares Car Wash — database seed                                    */
/* --------------------------------------------------------------------- */
/* Seeds a fully working single-branch system: roles, permissions, users, */
/* branch, settings, services, inventory, employees, customers, vehicles, */
/* expenses, ~7 months of wash records + receipts, notifications and      */
/* audit history. Re-runnable: transactional tables are reset first.      */
/* ===================================================================== */

/* --------------------------- Helpers --------------------------------- */

/** Deterministic PRNG so the demo data is stable between reseeds. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const daysAgo = (n: number, hour = 9, minute = 30): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const pad4 = (n: number) => String(n).padStart(4, "0");
const datePart = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/* ----------------------- Permission catalog -------------------------- */

const PERMISSIONS: { key: string; module: string; name: string; description: string }[] = [
  { key: "dashboard:view", module: "DASHBOARD", name: "View dashboard", description: "See KPIs and the overview" },
  { key: "customers:view", module: "CUSTOMERS", name: "View customers", description: "Browse the customer list and profiles" },
  { key: "customers:manage", module: "CUSTOMERS", name: "Manage customers", description: "Create, edit and delete customers" },
  { key: "vehicles:view", module: "VEHICLES", name: "View vehicles", description: "Browse registered vehicles" },
  { key: "vehicles:manage", module: "VEHICLES", name: "Manage vehicles", description: "Register, edit and delete vehicles" },
  { key: "wash-jobs:view", module: "WASH_JOBS", name: "View wash jobs", description: "See the job board and history" },
  { key: "wash-jobs:manage", module: "WASH_JOBS", name: "Manage wash jobs", description: "Record, start, complete and cancel washes" },
  { key: "bookings:view", module: "BOOKINGS", name: "View bookings", description: "See the appointment calendar and bookings" },
  { key: "bookings:manage", module: "BOOKINGS", name: "Manage bookings", description: "Create, reschedule and update bookings" },
  { key: "services:view", module: "SERVICES", name: "View services", description: "Browse the service catalogue" },
  { key: "services:manage", module: "SERVICES", name: "Manage services", description: "Create, edit and deactivate services" },
  { key: "employees:view", module: "EMPLOYEES", name: "View employees", description: "Browse the staff roster" },
  { key: "employees:manage", module: "EMPLOYEES", name: "Manage employees", description: "Add, edit and suspend staff" },
  { key: "inventory:view", module: "INVENTORY", name: "View inventory", description: "Browse stock levels" },
  { key: "inventory:manage", module: "INVENTORY", name: "Manage inventory", description: "Add items and adjust stock" },
  { key: "expenses:view", module: "EXPENSES", name: "View expenses", description: "Browse the expense ledger" },
  { key: "expenses:manage", module: "EXPENSES", name: "Manage expenses", description: "Create, edit and delete expenses" },
  { key: "expenses:approve", module: "EXPENSES", name: "Approve expenses", description: "Approve or reject pending expenses" },
  { key: "receipts:view", module: "RECEIPTS", name: "View receipts", description: "Browse issued receipts" },
  { key: "receipts:manage", module: "RECEIPTS", name: "Manage receipts", description: "Void and duplicate receipts" },
  { key: "reports:view", module: "REPORTS", name: "View reports", description: "Generate and export reports" },
  { key: "analytics:view", module: "ANALYTICS", name: "View analytics", description: "Executive analytics dashboard" },
  { key: "notifications:view", module: "NOTIFICATIONS", name: "View notifications", description: "See the notification centre" },
  { key: "settings:view", module: "SETTINGS", name: "View settings", description: "Read business configuration" },
  { key: "settings:manage", module: "SETTINGS", name: "Manage settings", description: "Change business configuration" },
  { key: "audit-logs:view", module: "AUDIT_LOGS", name: "View audit logs", description: "Review the action trail" },
  { key: "users:view", module: "USERS", name: "View users & roles", description: "See roles, permissions and users" },
  { key: "users:manage", module: "USERS", name: "Manage users & roles", description: "Create roles and assign permissions" },
  { key: "support:view", module: "SUPPORT", name: "Help & support", description: "Access the help centre" },
];

const ALL_KEYS = PERMISSIONS.map((p) => p.key);

const ROLES: { name: RoleName; description: string; permissions: string[] }[] = [
  { name: "OWNER", description: "Super admin — full access to the entire system", permissions: ALL_KEYS },
  {
    name: "MANAGER",
    description: "Runs day-to-day operations",
    permissions: [
      "dashboard:view",
      "customers:view", "customers:manage",
      "vehicles:view", "vehicles:manage",
      "wash-jobs:view", "wash-jobs:manage",
      "bookings:view", "bookings:manage",
      "services:view", "services:manage",
      "employees:view", "employees:manage",
      "inventory:view", "inventory:manage",
      "expenses:view", "expenses:manage", "expenses:approve",
      "receipts:view", "receipts:manage",
      "reports:view", "analytics:view", "notifications:view",
      "settings:view", "audit-logs:view", "users:view", "support:view",
    ],
  },
  {
    name: "CASHIER",
    description: "Handles payments and receipts",
    permissions: [
      "dashboard:view",
      "customers:view", "customers:manage",
      "vehicles:view",
      "wash-jobs:view", "wash-jobs:manage",
      "bookings:view", "bookings:manage",
      "services:view",
      "receipts:view", "receipts:manage",
      "notifications:view", "support:view",
    ],
  },
  {
    name: "ATTENDANT",
    description: "Records washes at the bay",
    permissions: [
      "dashboard:view",
      "customers:view",
      "vehicles:view",
      "wash-jobs:view", "wash-jobs:manage",
      "bookings:view", "bookings:manage",
      "services:view",
      "notifications:view", "support:view",
    ],
  },
];

const SETTINGS: Record<string, Prisma.InputJsonValue> = {
  "business.name": "Mig Flares Car Wash",
  "business.logo": "",
  "business.phone": "+260 977 000 001",
  "business.email": "info@migflares.co.zm",
  "business.address": "Nkoloma Stadium, Lusaka, Zambia",
  "business.taxNumber": "ZMW-1000456789",
  "business.currency": "ZMW",
  "business.timezone": "Africa/Lusaka",
  "business.hours": "Mon–Sat 08:00–18:00, Sun 09:00–15:00",
  "receipt.footer": "Thank you for washing with Mig Flares!",
  "receipt.prefix": "RCP",
  "receipt.numberFormat": "RCP-{date}-{seq:4}",
  "receipt.showTax": "false",
  "prefs.theme": "system",
  "prefs.language": "en",
  "prefs.dateFormat": "DD MMM YYYY",
  "prefs.backupFrequency": "daily",
  "security.passwordPolicy": "medium",
  "security.sessionTimeout": "60",
  "security.twoFactorEnabled": "false",
};

/* ------------------------------ Users -------------------------------- */

const USERS: { username: string; password: string; fullName: string; email: string; phone: string; role: RoleName }[] = [
  { username: "admin", password: "admin123", fullName: "Mig Flares", email: "owner@migflares.co.zm", phone: "+260 977 000 001", role: "OWNER" },
  { username: "manager", password: "manager123", fullName: "Chanda Mulenga", email: "manager@migflares.co.zm", phone: "+260 977 222 333", role: "MANAGER" },
  { username: "cashier", password: "cashier123", fullName: "Peter Zimba", email: "cashier@migflares.co.zm", phone: "+260 955 666 778", role: "CASHIER" },
];

/* ------------------------------ Services ----------------------------- */

interface SeedService {
  name: string;
  description: string;
  price: number;
  durationMin: number;
  category: ServiceCategory;
  icon: string;
  colour: string;
  displayOrder: number;
  requires: { sku: string; quantity: number }[];
}

const SERVICES: SeedService[] = [
  { name: "Express Rinse", description: "Quick exterior rinse and dry.", price: 60, durationMin: 10, category: "EXTERIOR", icon: "Zap", colour: "#F47B20", displayOrder: 1, requires: [{ sku: "CHM-001", quantity: 50 }] },
  { name: "Exterior Wash", description: "Full exterior wash, foam and hand dry.", price: 120, durationMin: 15, category: "EXTERIOR", icon: "Droplets", colour: "#0EA5E9", displayOrder: 2, requires: [{ sku: "CHM-001", quantity: 100 }, { sku: "CON-002", quantity: 2 }] },
  { name: "Interior Vacuum", description: "Interior vacuum, dash and console wipe.", price: 80, durationMin: 20, category: "INTERIOR", icon: "Wind", colour: "#14B8A6", displayOrder: 3, requires: [{ sku: "CON-002", quantity: 1 }] },
  { name: "Full Wash & Vacuum", description: "Exterior wash plus interior vacuum and wipe down.", price: 180, durationMin: 35, category: "FULL", icon: "Waves", colour: "#191919", displayOrder: 4, requires: [{ sku: "CHM-001", quantity: 120 }, { sku: "CHM-002", quantity: 20 }, { sku: "CON-002", quantity: 3 }] },
  { name: "Premium Detail", description: "Deep clean: shampoo, wax, polish and dressings.", price: 450, durationMin: 90, category: "DETAILING", icon: "Sparkles", colour: "#8B5CF6", displayOrder: 5, requires: [{ sku: "CHM-001", quantity: 200 }, { sku: "CHM-003", quantity: 15 }, { sku: "CHM-002", quantity: 30 }, { sku: "CHM-005", quantity: 25 }] },
  { name: "Wax & Polish", description: "Hand wax, paint polish and buff.", price: 250, durationMin: 45, category: "DETAILING", icon: "Brush", colour: "#F59E0B", displayOrder: 6, requires: [{ sku: "CHM-003", quantity: 10 }, { sku: "CHM-005", quantity: 15 }] },
  { name: "Engine Bay Clean", description: "Engine degrease and dress.", price: 200, durationMin: 30, category: "OTHER", icon: "Gauge", colour: "#EF4444", displayOrder: 7, requires: [{ sku: "CHM-004", quantity: 1 }] },
  { name: "Underbody Wash", description: "Chassis and wheel-arch pressure wash.", price: 150, durationMin: 20, category: "EXTERIOR", icon: "ShieldCheck", colour: "#10B981", displayOrder: 8, requires: [{ sku: "CHM-001", quantity: 150 }] },
  { name: "Wheel & Tyre Shine", description: "Alloy deep clean and tyre dressing.", price: 90, durationMin: 15, category: "EXTERIOR", icon: "Sun", colour: "#6366F1", displayOrder: 9, requires: [{ sku: "CHM-002", quantity: 25 }, { sku: "CHM-007", quantity: 30 }] },
  { name: "Upholstery Shampoo", description: "Seats and carpets hot-water extraction.", price: 320, durationMin: 60, category: "INTERIOR", icon: "PaintBucket", colour: "#EC4899", displayOrder: 10, requires: [{ sku: "CHM-006", quantity: 120 }, { sku: "CON-002", quantity: 4 }] },
];

/* ----------------------------- Inventory ----------------------------- */

interface SeedInventory {
  name: string;
  sku: string;
  category: "CLEANING_CHEMICALS" | "EQUIPMENT" | "CONSUMABLES" | "SUPPLIES" | "OTHER";
  supplier: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  quantityAvailable: number;
  minimumQuantity: number;
  maximumQuantity: number;
  reorderLevel: number;
  storageLocation: string;
  lastRestocked: number; // days ago
}

const INVENTORY: SeedInventory[] = [
  { name: "Car Wash Soap", sku: "CHM-001", category: "CLEANING_CHEMICALS", supplier: "Lusaka Chem Supplies", unit: "ml", costPrice: 18, sellingPrice: 30, quantityAvailable: 25000, minimumQuantity: 1000, maximumQuantity: 50000, reorderLevel: 8000, storageLocation: "Shelf A1", lastRestocked: 3 },
  { name: "Tyre Shine", sku: "CHM-002", category: "CLEANING_CHEMICALS", supplier: "Total Zambia", unit: "ml", costPrice: 35, sellingPrice: 55, quantityAvailable: 12000, minimumQuantity: 800, maximumQuantity: 30000, reorderLevel: 5000, storageLocation: "Shelf A2", lastRestocked: 6 },
  { name: "Carnauba Wax", sku: "CHM-003", category: "CLEANING_CHEMICALS", supplier: "AutoZone Lusaka", unit: "g", costPrice: 95, sellingPrice: 150, quantityAvailable: 3200, minimumQuantity: 300, maximumQuantity: 8000, reorderLevel: 1500, storageLocation: "Shelf A3", lastRestocked: 12 },
  { name: "Degreaser", sku: "CHM-004", category: "CLEANING_CHEMICALS", supplier: "Lusaka Chem Supplies", unit: "L", costPrice: 65, sellingPrice: 100, quantityAvailable: 60, minimumQuantity: 10, maximumQuantity: 200, reorderLevel: 30, storageLocation: "Shelf A4", lastRestocked: 8 },
  { name: "Polish Compound", sku: "CHM-005", category: "CLEANING_CHEMICALS", supplier: "AutoZone Lusaka", unit: "g", costPrice: 140, sellingPrice: 220, quantityAvailable: 950, minimumQuantity: 100, maximumQuantity: 4000, reorderLevel: 600, storageLocation: "Shelf A5", lastRestocked: 15 },
  { name: "Interior Sanitizer", sku: "CHM-006", category: "CLEANING_CHEMICALS", supplier: "Lusaka Chem Supplies", unit: "ml", costPrice: 28, sellingPrice: 60, quantityAvailable: 7000, minimumQuantity: 500, maximumQuantity: 20000, reorderLevel: 3000, storageLocation: "Shelf A6", lastRestocked: 4 },
  { name: "Glass Cleaner", sku: "CHM-007", category: "CLEANING_CHEMICALS", supplier: "City Traders", unit: "ml", costPrice: 20, sellingPrice: 40, quantityAvailable: 0, minimumQuantity: 500, maximumQuantity: 15000, reorderLevel: 2500, storageLocation: "Shelf A7", lastRestocked: 40 },
  { name: "Wheel Cleaner", sku: "CHM-008", category: "CLEANING_CHEMICALS", supplier: "Lusaka Chem Supplies", unit: "ml", costPrice: 30, sellingPrice: 50, quantityAvailable: 9000, minimumQuantity: 500, maximumQuantity: 20000, reorderLevel: 3000, storageLocation: "Shelf A8", lastRestocked: 5 },
  { name: "Shampoo Concentrate", sku: "CHM-009", category: "CLEANING_CHEMICALS", supplier: "City Traders", unit: "L", costPrice: 55, sellingPrice: 90, quantityAvailable: 110, minimumQuantity: 15, maximumQuantity: 300, reorderLevel: 40, storageLocation: "Shelf A9", lastRestocked: 2 },
  { name: "Odor Eliminator", sku: "CHM-010", category: "CLEANING_CHEMICALS", supplier: "City Traders", unit: "ml", costPrice: 42, sellingPrice: 80, quantityAvailable: 1800, minimumQuantity: 200, maximumQuantity: 5000, reorderLevel: 800, storageLocation: "Shelf A10", lastRestocked: 9 },
  { name: "Air Fresheners", sku: "CON-001", category: "CONSUMABLES", supplier: "City Traders", unit: "unit", costPrice: 18, sellingPrice: 40, quantityAvailable: 85, minimumQuantity: 20, maximumQuantity: 500, reorderLevel: 50, storageLocation: "Shelf B1", lastRestocked: 2 },
  { name: "Microfiber Towels", sku: "CON-002", category: "CONSUMABLES", supplier: "CleanRite Distributors", unit: "unit", costPrice: 22, sellingPrice: 45, quantityAvailable: 24, minimumQuantity: 20, maximumQuantity: 400, reorderLevel: 50, storageLocation: "Bin C2", lastRestocked: 18 },
  { name: "Drying Towels XL", sku: "CON-003", category: "CONSUMABLES", supplier: "CleanRite Distributors", unit: "unit", costPrice: 38, sellingPrice: 70, quantityAvailable: 60, minimumQuantity: 10, maximumQuantity: 200, reorderLevel: 30, storageLocation: "Bin C3", lastRestocked: 10 },
  { name: "Wash Mitts", sku: "CON-004", category: "CONSUMABLES", supplier: "CleanRite Distributors", unit: "unit", costPrice: 15, sellingPrice: 30, quantityAvailable: 130, minimumQuantity: 20, maximumQuantity: 300, reorderLevel: 50, storageLocation: "Bin C4", lastRestocked: 11 },
  { name: "Applicator Pads", sku: "SUP-001", category: "SUPPLIES", supplier: "CleanRite Distributors", unit: "unit", costPrice: 8, sellingPrice: 15, quantityAvailable: 300, minimumQuantity: 50, maximumQuantity: 1000, reorderLevel: 100, storageLocation: "Shelf B2", lastRestocked: 9 },
  { name: "Aprons", sku: "SUP-002", category: "SUPPLIES", supplier: "City Traders", unit: "unit", costPrice: 45, sellingPrice: 0, quantityAvailable: 6, minimumQuantity: 4, maximumQuantity: 50, reorderLevel: 8, storageLocation: "Bin D1", lastRestocked: 22 },
  { name: "Trash Bags", sku: "SUP-003", category: "SUPPLIES", supplier: "City Traders", unit: "pack", costPrice: 12, sellingPrice: 20, quantityAvailable: 28, minimumQuantity: 5, maximumQuantity: 100, reorderLevel: 12, storageLocation: "Shelf B5", lastRestocked: 1 },
  { name: "Spray Bottles", sku: "SUP-004", category: "SUPPLIES", supplier: "CleanRite Distributors", unit: "unit", costPrice: 25, sellingPrice: 45, quantityAvailable: 42, minimumQuantity: 8, maximumQuantity: 120, reorderLevel: 20, storageLocation: "Shelf B6", lastRestocked: 16 },
  { name: "Detailing Brushes", sku: "SUP-005", category: "SUPPLIES", supplier: "AutoZone Lusaka", unit: "set", costPrice: 85, sellingPrice: 150, quantityAvailable: 9, minimumQuantity: 2, maximumQuantity: 30, reorderLevel: 5, storageLocation: "Shelf B7", lastRestocked: 20 },
  { name: "Pressure Gun", sku: "EQP-001", category: "EQUIPMENT", supplier: "Kafue Hardware", unit: "unit", costPrice: 850, sellingPrice: 0, quantityAvailable: 6, minimumQuantity: 1, maximumQuantity: 20, reorderLevel: 2, storageLocation: "Tool Room", lastRestocked: 30 },
  { name: "Buckets 20L", sku: "EQP-002", category: "EQUIPMENT", supplier: "Kafue Hardware", unit: "unit", costPrice: 120, sellingPrice: 0, quantityAvailable: 12, minimumQuantity: 2, maximumQuantity: 30, reorderLevel: 4, storageLocation: "Tool Room", lastRestocked: 35 },
  { name: "Foam Cannon", sku: "EQP-003", category: "EQUIPMENT", supplier: "AutoZone Lusaka", unit: "unit", costPrice: 450, sellingPrice: 0, quantityAvailable: 0, minimumQuantity: 1, maximumQuantity: 10, reorderLevel: 2, storageLocation: "Tool Room", lastRestocked: 60 },
  { name: "Steam Cleaner", sku: "EQP-004", category: "EQUIPMENT", supplier: "Kafue Hardware", unit: "unit", costPrice: 3200, sellingPrice: 0, quantityAvailable: 1, minimumQuantity: 1, maximumQuantity: 4, reorderLevel: 1, storageLocation: "Tool Room", lastRestocked: 45 },
  { name: "Vacuum Cleaner", sku: "EQP-005", category: "EQUIPMENT", supplier: "Kafue Hardware", unit: "unit", costPrice: 1400, sellingPrice: 0, quantityAvailable: 2, minimumQuantity: 1, maximumQuantity: 6, reorderLevel: 1, storageLocation: "Tool Room", lastRestocked: 50 },
  { name: "Clay Bar Kit", sku: "DET-001", category: "CLEANING_CHEMICALS", supplier: "AutoZone Lusaka", unit: "unit", costPrice: 120, sellingPrice: 200, quantityAvailable: 14, minimumQuantity: 4, maximumQuantity: 60, reorderLevel: 10, storageLocation: "Shelf B3", lastRestocked: 14 },
  { name: "Leather Conditioner", sku: "DET-002", category: "CLEANING_CHEMICALS", supplier: "Total Zambia", unit: "ml", costPrice: 75, sellingPrice: 130, quantityAvailable: 2600, minimumQuantity: 300, maximumQuantity: 6000, reorderLevel: 1000, storageLocation: "Shelf B4", lastRestocked: 7 },
];

/* ----------------------------- Employees ----------------------------- */

interface SeedEmployee {
  firstName: string;
  lastName: string;
  position: string;
  phone: string;
  email: string | null;
  nrcNumber: string;
  hireDaysAgo: number;
  salary: number;
  emergencyContact: { name: string; phone: string; relation: string } | null;
  notes: string | null;
  isActive?: boolean;
}

const EMPLOYEES: SeedEmployee[] = [
  { firstName: "Tapiwa", lastName: "Mbewe", position: "Lead Attendant", phone: "+260 977 111 223", email: "tapiwa@migflares.co.zm", nrcNumber: "246810/55/1", hireDaysAgo: 700, salary: 4200, emergencyContact: { name: "Esther Mbewe", phone: "+260 966 121 212", relation: "Wife" }, notes: "Lead of the exterior crew." },
  { firstName: "Chileshe", lastName: "Mwila", position: "Attendant", phone: "+260 966 222 334", email: null, nrcNumber: "135790/44/1", hireDaysAgo: 500, salary: 3000, emergencyContact: null, notes: null },
  { firstName: "Kabaso", lastName: "Daka", position: "Attendant", phone: "+260 955 333 445", email: null, nrcNumber: "864209/33/1", hireDaysAgo: 420, salary: 3000, emergencyContact: { name: "Grace Daka", phone: "+260 977 333 334", relation: "Mother" }, notes: null },
  { firstName: "Misozi", lastName: "Chanda", position: "Detailer", phone: "+260 977 444 556", email: "misozi@migflares.co.zm", nrcNumber: "975310/22/1", hireDaysAgo: 380, salary: 3800, emergencyContact: null, notes: "Certified in hot-water extraction." },
  { firstName: "Bupe", lastName: "Kasonde", position: "Detailer", phone: "+260 966 555 667", email: null, nrcNumber: "642097/11/1", hireDaysAgo: 300, salary: 3600, emergencyContact: { name: "Joseph Kasonde", phone: "+260 955 555 556", relation: "Father" }, notes: null },
  { firstName: "Peter", lastName: "Zimba", position: "Cashier", phone: "+260 955 666 778", email: null, nrcNumber: "501234/88/1", hireDaysAgo: 250, salary: 3200, emergencyContact: null, notes: "Handles the till and receipts." },
  { firstName: "Martha", lastName: "Sichone", position: "Supervisor", phone: "+260 977 777 889", email: "martha@migflares.co.zm", nrcNumber: "398765/77/1", hireDaysAgo: 200, salary: 5500, emergencyContact: { name: "Brian Sichone", phone: "+260 966 777 778", relation: "Husband" }, notes: "Runs shift scheduling.", isActive: false },
  { firstName: "Mutinta", lastName: "Bwalya", position: "Attendant", phone: "+260 977 888 990", email: null, nrcNumber: "210987/66/1", hireDaysAgo: 180, salary: 2800, emergencyContact: null, notes: null },
  { firstName: "Chomba", lastName: "Chileshe", position: "Attendant", phone: "+260 966 999 001", email: null, nrcNumber: "109876/55/1", hireDaysAgo: 160, salary: 2800, emergencyContact: { name: "Luyando Chileshe", phone: "+260 955 999 990", relation: "Sister" }, notes: null },
  { firstName: "Sampa", lastName: "Mukuka", position: "Detailer", phone: "+260 955 000 112", email: "sampa@migflares.co.zm", nrcNumber: "876543/44/1", hireDaysAgo: 140, salary: 3600, emergencyContact: null, notes: null },
  { firstName: "Namwinga", lastName: "Phiri", position: "Attendant", phone: "+260 977 123 456", email: null, nrcNumber: "765432/33/1", hireDaysAgo: 130, salary: 2800, emergencyContact: null, notes: null },
  { firstName: "Moses", lastName: "Zulu", position: "Lead Attendant", phone: "+260 966 234 567", email: "moses@migflares.co.zm", nrcNumber: "654321/22/1", hireDaysAgo: 120, salary: 4200, emergencyContact: { name: "Ruth Zulu", phone: "+260 955 234 566", relation: "Wife" }, notes: null },
  { firstName: "Precious", lastName: "Mwamba", position: "Cashier", phone: "+260 977 345 678", email: null, nrcNumber: "543210/11/1", hireDaysAgo: 110, salary: 3200, emergencyContact: null, notes: null },
  { firstName: "Collins", lastName: "Sakala", position: "Attendant", phone: "+260 966 456 789", email: null, nrcNumber: "432109/99/1", hireDaysAgo: 100, salary: 2800, emergencyContact: null, notes: null },
  { firstName: "Charity", lastName: "Lungu", position: "Supervisor", phone: "+260 955 567 890", email: "charity@migflares.co.zm", nrcNumber: "321098/88/1", hireDaysAgo: 90, salary: 5500, emergencyContact: { name: "Joseph Lungu", phone: "+260 977 567 889", relation: "Husband" }, notes: null },
  { firstName: "Victor", lastName: "Nyirenda", position: "Attendant", phone: "+260 977 678 901", email: null, nrcNumber: "210987/77/1", hireDaysAgo: 80, salary: 2800, emergencyContact: null, notes: "Night-shift preference." },
  { firstName: "Esther", lastName: "Simukonda", position: "Detailer", phone: "+260 966 789 012", email: "esther@migflares.co.zm", nrcNumber: "109876/66/1", hireDaysAgo: 70, salary: 3600, emergencyContact: null, notes: null },
  { firstName: "Daliso", lastName: "Mbewe", position: "Attendant", phone: "+260 955 890 123", email: null, nrcNumber: "987654/55/1", hireDaysAgo: 60, salary: 2800, emergencyContact: { name: "Agnes Mbewe", phone: "+260 977 890 122", relation: "Mother" }, notes: null },
  { firstName: "Memory", lastName: "Chisanga", position: "Cashier", phone: "+260 977 901 234", email: null, nrcNumber: "876543/45/1", hireDaysAgo: 50, salary: 3200, emergencyContact: null, notes: null },
  { firstName: "Henry", lastName: "Kasonde", position: "Attendant", phone: "+260 966 012 345", email: null, nrcNumber: "765432/34/1", hireDaysAgo: 40, salary: 2800, emergencyContact: null, notes: null },
];

/* ------------------------- Reference datasets ------------------------ */

const FIRST_NAMES = [
  "Chanda", "Mwansa", "Thandiwe", "Kelvin", "Natasha", "Gift", "Ruth", "Emmanuel",
  "Grace", "Joseph", "Patricia", "Brian", "Tapiwa", "Chileshe", "Kabaso", "Misozi",
  "Bupe", "Peter", "Martha", "Luyando", "Mukuka", "Chilufya", "Mutinta", "Bwalya",
  "Nchimunya", "Sampa", "Namwinga", "Chomba", "Mwila", "Moses", "Daniel", "Samuel",
  "Victor", "Michael", "Andrew", "James", "John", "Gilbert", "Patrick", "Charles",
  "Robert", "Francis", "Christopher", "Stephen", "Isaac", "Collins", "Daliso", "Frank",
  "Godfrey", "Henry", "Precious", "Mary", "Rose", "Esther", "Charity", "Memory",
  "Beauty", "Chishimba", "Chipo", "Lungowe", "Musonda", "Mwape", "Sinkala", "Chibesa",
];

const LAST_NAMES = [
  "Banda", "Tembo", "Phiri", "Zulu", "Mwale", "Sakala", "Mwamba", "Mumba",
  "Chisanga", "Lungu", "Nyirenda", "Simukonda", "Mbewe", "Mwila", "Daka", "Chanda",
  "Kasonde", "Zimba", "Sichone", "Mwansa", "Mukuka", "Chileshe", "Bwalya", "Mutale",
  "Mulenga", "Musonda", "Chilufya", "Nkhoma", "Kamanga", "Soko", "Miti", "Phanga",
];

const SUBURBS = [
  "Woodlands", "Ibex Hill", "Chilenje", "Kabulonga", "Lilayi", "Matero", "Chelston",
  "Northmead", "Avondale", "Olympia", "Roma", "Mass Media", "Thornpark", "Kalundu",
  "Libala", "Chudleigh", "Kabwata", "Emmasdale", "Kalingalinga", "Mtendere", "Garden",
  "Chazanga", "Makeni", "Ridgeway", "Fairview", "Longacres", "Manda Hill", "New Kasama",
];

const PLATE_PREFIXES = ["BAA", "BAB", "BAE", "BAG", "BAJ", "BAL", "BAM", "BAN", "BAP", "BAT", "BAX", "BAY", "ALM", "ALP", "ALR", "ALZ", "AAM", "AAJ", "AAK", "ABD"];

const MAKES_MODELS: { make: string; models: string[] }[] = [
  { make: "Toyota", models: ["Hilux", "Corolla", "Land Cruiser", "RAV4", "Fortuner", "Prado", "Hiace", "Vitz"] },
  { make: "Nissan", models: ["X-Trail", "Navara", "Almera", "Qashqai", "Patrol"] },
  { make: "BMW", models: ["320i", "X3", "X5", "520d"] },
  { make: "Mercedes-Benz", models: ["C200", "E250", "GLE"] },
  { make: "Ford", models: ["Ranger", "Everest", "Focus", "Fiesta"] },
  { make: "Volkswagen", models: ["Golf 7", "Polo", "Tiguan", "Amarok"] },
  { make: "Mazda", models: ["CX-5", "Demio", "Axela"] },
  { make: "Honda", models: ["Fit", "CR-V", "Civic"] },
  { make: "Hyundai", models: ["Tucson", "Elantra", "i10"] },
  { make: "Suzuki", models: ["Swift", "Vitara"] },
  { make: "Isuzu", models: ["D-Max", "MU-X"] },
  { make: "Mitsubishi", models: ["Pajero", "L200", "Outlander"] },
  { make: "Subaru", models: ["Forester", "Impreza"] },
  { make: "Lexus", models: ["RX350", "LX570"] },
  { make: "Kia", models: ["Sportage", "Picanto"] },
];

const COLORS = ["White", "Black", "Silver", "Grey", "Blue", "Red", "Green", "Maroon", "Gold", "Beige"];
const VEHICLE_TYPES = ["SEDAN", "SUV", "HATCHBACK", "TRUCK", "VAN", "MOTORCYCLE", "BUS", "OTHER"] as const;

const WASH_EXTRAS: { id: string; name: string; price: number }[] = [
  { id: "ext-air", name: "Air Freshener", price: 40 },
  { id: "ext-sanitize", name: "Interior Sanitize", price: 60 },
  { id: "ext-tyre", name: "Tyre Shine", price: 50 },
  { id: "ext-polish", name: "Headlight Polish", price: 70 },
  { id: "ext-wax", name: "Quick Wax", price: 100 },
  { id: "ext-vacuum", name: "Extra Vacuum", price: 50 },
];

const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER"] as const;

const phone = (rng: () => number): string => {
  const prefix = ["97", "96", "95", "97", "96"][Math.floor(rng() * 5)];
  return `+260 ${prefix} ${100 + Math.floor(rng() * 900)} ${100 + Math.floor(rng() * 900)}`;
};

const emailFor = (rng: () => number, first: string, last: string): string =>
  `${first.toLowerCase()}.${last.toLowerCase()}@${["gmail.com", "yahoo.com", "outlook.com", "zamtel.co.zm"][Math.floor(rng() * 4)]}`;

/* ------------------------------ Expenses ----------------------------- */

const EXPENSE_TEMPLATES: {
  category: "RENT" | "ELECTRICITY" | "WATER" | "INTERNET" | "FUEL" | "EQUIPMENT" | "CLEANING_CHEMICALS" | "REPAIRS" | "STAFF_SALARIES" | "MARKETING" | "MISC";
  vendor: string;
  description: string;
  amount: [number, number];
  frequency: number;
}[] = [
  { category: "RENT", vendor: "Nkoloma Stadium Authority", description: "Monthly site rental", amount: [11000, 12500], frequency: 1 },
  { category: "ELECTRICITY", vendor: "ZESCO", description: "Power bill — pumps and lights", amount: [2400, 3400], frequency: 1 },
  { category: "WATER", vendor: "Lusaka Water", description: "Monthly water connection", amount: [800, 1200], frequency: 1 },
  { category: "INTERNET", vendor: "Zamtel", description: "Fiber internet — front desk", amount: [750, 950], frequency: 1 },
  { category: "FUEL", vendor: "Puma Energy", description: "Pressure washer generator fuel", amount: [600, 1400], frequency: 3 },
  { category: "CLEANING_CHEMICALS", vendor: "Lusaka Chem Supplies", description: "Soap, degreaser and sanitizer restock", amount: [1500, 3200], frequency: 2 },
  { category: "EQUIPMENT", vendor: "Kafue Hardware", description: "Equipment maintenance and parts", amount: [1200, 4800], frequency: 0.4 },
  { category: "REPAIRS", vendor: "T & M Auto Repairs", description: "Generator and pump service", amount: [600, 2200], frequency: 0.5 },
  { category: "STAFF_SALARIES", vendor: "Mig Flares", description: "Monthly payroll", amount: [16500, 19500], frequency: 1 },
  { category: "MARKETING", vendor: "Radio Phoenix", description: "Promotional ad slot", amount: [900, 2200], frequency: 0.6 },
  { category: "MISC", vendor: "City Traders", description: "Stationery and sundries", amount: [250, 900], frequency: 0.7 },
];

/* ===================================================================== */
/* Main                                                                   */
/* ===================================================================== */

async function main() {
  console.log("[seed] Starting…");

  // ---- Reset transactional/bulk tables so the seed is re-runnable ----
  await prisma.receipt.deleteMany({});
  await prisma.washRecord.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.serviceInventoryRequirement.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.service.deleteMany({});
  console.log("[seed] Reset transactional tables");

  // ---- Permissions ----
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, name: p.name, description: p.description },
      create: p,
    });
  }
  console.log(`[seed] ${PERMISSIONS.length} permissions ready`);

  // ---- Roles + role-permission matrix ----
  for (const role of ROLES) {
    const saved = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, permissions: role.permissions },
      create: { name: role.name, description: role.description, permissions: role.permissions },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } });
    const perms = await prisma.permission.findMany({ where: { key: { in: role.permissions } } });
    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: saved.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }
  console.log("[seed] Roles + permissions ready");

  // ---- Branch ----
  const branch = await prisma.branch.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: { name: "Nkoloma Stadium", location: "Lusaka, Zambia" },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Nkoloma Stadium",
      location: "Lusaka, Zambia",
      phone: "+260 977 000 000",
    },
  });
  const branchId = branch.id;
  console.log("[seed] Branch ready:", branch.name);

  // ---- Users ----
  const users: Record<string, string> = {}; // username -> id
  for (const u of USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });
    const passwordHash = await bcrypt.hash(u.password, 12);
    const saved = await prisma.user.upsert({
      where: { username: u.username },
      update: { fullName: u.fullName, email: u.email, phone: u.phone, roleId: role.id, branchId },
      create: {
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        passwordHash,
        roleId: role.id,
        branchId,
      },
    });
    users[u.username] = saved.id;
  }
  const adminId = users.admin;
  console.log("[seed] Users ready (admin/admin123, manager/manager123, cashier/cashier123)");

  // ---- Settings ----
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.settings.upsert({
      where: { key_branchId: { key, branchId } },
      update: { value },
      create: { key, value, branchId },
    });
  }
  console.log("[seed] Settings ready");

  // ---- Inventory ----
  const inventoryRows = INVENTORY.map((item) => ({
    id: randomUUID(),
    name: item.name,
    sku: item.sku,
    category: item.category,
    supplier: item.supplier,
    unit: item.unit,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    quantityAvailable: item.quantityAvailable,
    minimumQuantity: item.minimumQuantity,
    maximumQuantity: item.maximumQuantity,
    reorderLevel: item.reorderLevel,
    storageLocation: item.storageLocation,
    lastRestocked: daysAgo(item.lastRestocked),
    isActive: true,
    branchId,
  }));
  await prisma.inventoryItem.createMany({ data: inventoryRows });
  const inventoryById = new Map(inventoryRows.map((i) => [i.id, i]));
  const inventoryIdBySku = new Map(inventoryRows.map((i) => [i.sku, i.id]));
  console.log(`[seed] ${inventoryRows.length} inventory items ready`);

  // ---- Services + requirements ----
  const serviceRows = SERVICES.map((s) => ({
    id: randomUUID(),
    name: s.name,
    description: s.description,
    price: s.price,
    durationMin: s.durationMin,
    category: s.category,
    icon: s.icon,
    colour: s.colour,
    displayOrder: s.displayOrder,
    isActive: true,
    branchId,
  }));
  await prisma.service.createMany({ data: serviceRows });
  const serviceById = new Map(serviceRows.map((s) => [s.id, s]));

  const requirementRows: Prisma.ServiceInventoryRequirementCreateManyInput[] = [];
  for (const s of serviceRows) {
    const def = SERVICES.find((x) => x.name === s.name)!;
    for (const req of def.requires) {
      requirementRows.push({
        id: randomUUID(),
        serviceId: s.id,
        inventoryItemId: inventoryIdBySku.get(req.sku)!,
        quantity: req.quantity,
      });
    }
  }
  await prisma.serviceInventoryRequirement.createMany({ data: requirementRows });
  console.log(`[seed] ${serviceRows.length} services ready`);

  // ---- Employees ----
  const employeeRows = EMPLOYEES.map((e) => ({
    id: randomUUID(),
    firstName: e.firstName,
    lastName: e.lastName,
    phone: e.phone,
    email: e.email,
    nrcNumber: e.nrcNumber,
    position: e.position,
    hireDate: daysAgo(e.hireDaysAgo),
    salary: e.salary,
    emergencyContact: e.emergencyContact as unknown as Prisma.InputJsonValue,
    notes: e.notes,
    isActive: e.isActive ?? true,
    branchId,
  }));
  await prisma.employee.createMany({ data: employeeRows });
  const employees = employeeRows;
  console.log(`[seed] ${employeeRows.length} employees ready`);

  // ---- Customers ----
  const rngCustomers = mulberry32(20260101);
  const customers = Array.from({ length: 100 }, () => {
    const first = FIRST_NAMES[Math.floor(rngCustomers() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rngCustomers() * LAST_NAMES.length)];
    const statusRoll = rngCustomers();
    const status = statusRoll < 0.76 ? "ACTIVE" : statusRoll < 0.88 ? "VIP" : statusRoll < 0.96 ? "INACTIVE" : "BLACKLISTED";
    return {
      id: randomUUID(),
      firstName: first,
      lastName: last,
      phone: phone(rngCustomers),
      email: rngCustomers() < 0.75 ? emailFor(rngCustomers, first, last) : null,
      address: rngCustomers() < 0.7 ? `${SUBURBS[Math.floor(rngCustomers() * SUBURBS.length)]}, Lusaka` : null,
      notes: rngCustomers() < 0.18 ? "Frequent visitor — prefers express service." : null,
      avatarUrl: null,
      status: status as "ACTIVE" | "INACTIVE" | "VIP" | "BLACKLISTED",
      createdAt: daysAgo(20 + Math.floor(rngCustomers() * 380)),
      branchId,
    };
  });
  await prisma.customer.createMany({ data: customers });
  const customerById = new Map(customers.map((c) => [c.id, c]));
  console.log(`[seed] ${customers.length} customers ready`);

  // ---- Vehicles ----
  const rngVehicles = mulberry32(20260202);
  const vehicles = Array.from({ length: 120 }, () => {
    const customer = customers[Math.floor(rngVehicles() * customers.length)];
    const mm = MAKES_MODELS[Math.floor(rngVehicles() * MAKES_MODELS.length)];
    const plate = `${PLATE_PREFIXES[Math.floor(rngVehicles() * PLATE_PREFIXES.length)]} ${1000 + Math.floor(rngVehicles() * 8999)}`;
    const roll = rngVehicles();
    return {
      id: randomUUID(),
      plateNumber: plate,
      make: mm.make,
      model: mm.models[Math.floor(rngVehicles() * mm.models.length)],
      year: 2012 + Math.floor(rngVehicles() * 12),
      color: COLORS[Math.floor(rngVehicles() * COLORS.length)],
      vehicleType: VEHICLE_TYPES[Math.floor(rngVehicles() * VEHICLE_TYPES.length)],
      imageUrl: null,
      customerId: customer.id,
      status: (roll < 0.92 ? "ACTIVE" : "IN_SERVICE") as "ACTIVE" | "IN_SERVICE",
      createdAt: daysAgo(10 + Math.floor(rngVehicles() * 360)),
      branchId,
    };
  });
  await prisma.vehicle.createMany({ data: vehicles });
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  console.log(`[seed] ${vehicles.length} vehicles ready`);

  // ---- Expenses ----
  const rngExpenses = mulberry32(20260404);
  const expenseRows = Array.from({ length: 100 }, () => {
    const template = EXPENSE_TEMPLATES[Math.floor(rngExpenses() * EXPENSE_TEMPLATES.length)];
    const amount = template.amount[0] + Math.floor(rngExpenses() * (template.amount[1] - template.amount[0]));
    const daysBack = Math.floor(rngExpenses() * 180);
    const roll = rngExpenses();
    const status = roll < 0.72 ? "APPROVED" : roll < 0.9 ? "PENDING" : "REJECTED";
    const expenseDate = daysAgo(daysBack, 8 + Math.floor(rngExpenses() * 9), Math.floor(rngExpenses() * 59));
    const employee = employees[Math.floor(rngExpenses() * employees.length)];
    return {
      id: randomUUID(),
      amount,
      category: template.category,
      vendor: template.vendor,
      description: template.description,
      receiptUrl: null,
      paymentMethod: PAYMENT_METHODS[Math.floor(rngExpenses() * 4)],
      expenseDate,
      status,
      createdById: adminId,
      employeeId: rngExpenses() < 0.6 ? employee.id : null,
      approvedById: status === "PENDING" ? null : adminId,
      approvedAt: status === "PENDING" ? null : expenseDate,
      branchId,
    };
  });
  expenseRows.sort((a, b) => (a.expenseDate < b.expenseDate ? 1 : -1));
  await prisma.expense.createMany({ data: expenseRows });
  console.log(`[seed] ${expenseRows.length} expenses ready`);

  // ---- Wash records + receipts (~7 months) ----
  const rng = mulberry32(20260806);
  const washRows: Prisma.WashRecordCreateManyInput[] = [];
  const receiptRows: Prisma.ReceiptCreateManyInput[] = [];
  const lastVisitByCustomer = new Map<string, Date>();
  const lastWashByVehicle = new Map<string, Date>();

  let washSeq = 1001;
  let receiptSeq = 1001;
  const totalDays = 150;

  for (let dayOffset = totalDays - 1; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const weekday = date.getDay();
    const base = weekday === 0 || weekday === 6 ? 2 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 4);
    const count = Math.max(1, base);

    for (let i = 0; i < count; i++) {
      const created = new Date(date);
      const hour = weekday === 0 ? 9 + Math.floor(rng() * 5) : 8 + Math.floor(rng() * 10);
      created.setHours(hour, Math.floor(rng() * 59), 0, 0);
      if (created.getTime() > Date.now()) created.setTime(Date.now() - (i + 1) * 60_000);

      const vehicle = vehicles[Math.floor(rng() * vehicles.length)];
      const customer = customerById.get(vehicle.customerId) ?? customers[0];
      const service = serviceRows[Math.floor(rng() * serviceRows.length)];
      const employee = employees[Math.floor(rng() * employees.length)];

      const extras: { id: string; name: string; price: number }[] = [];
      const extraCount = Math.floor(rng() * 3);
      for (let e = 0; e < extraCount; e++) {
        const extra = WASH_EXTRAS[Math.floor(rng() * WASH_EXTRAS.length)];
        if (!extras.some((x) => x.id === extra.id)) extras.push({ ...extra });
      }

      const discount = rng() < 0.18 ? (1 + Math.floor(rng() * 3)) * 10 : 0;
      const subtotal = service.price + extras.reduce((s, x) => s + x.price, 0);
      const total = Math.max(0, subtotal - discount);

      let status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      if (dayOffset > 1) status = rng() < 0.91 ? "COMPLETED" : "CANCELLED";
      else {
        const r = rng();
        status = r < 0.35 ? "COMPLETED" : r < 0.65 ? "IN_PROGRESS" : "PENDING";
      }

      const startedAt = status !== "PENDING" ? new Date(created.getTime() + 5 * 60_000) : null;
      const completedAt = status === "COMPLETED" ? new Date(created.getTime() + 45 * 60_000) : null;
      const cancelledAt = status === "CANCELLED" ? new Date(created.getTime() + 20 * 60_000) : null;

      const washId = randomUUID();
      const reference = `WF-${datePart(created)}-${pad4(washSeq)}`;
      washSeq++;

      washRows.push({
        id: washId,
        reference,
        customerId: customer.id,
        vehicleId: vehicle.id,
        serviceId: service.id,
        extras: extras as unknown as Prisma.InputJsonValue,
        discount,
        subtotal,
        total,
        paymentMethod: PAYMENT_METHODS[Math.floor(rng() * 4)],
        employeeId: employee.id,
        assignedById: adminId,
        notes: rng() < 0.2 ? "Customer requested extra care on the interior." : null,
        status,
        beforePhotos: [],
        afterPhotos: [],
        startedAt,
        completedAt,
        cancelledAt,
        branchId,
        createdAt: created,
      });

      if (status === "COMPLETED") {
        const receiptNo = `RCP-${datePart(completedAt!)}-${pad4(receiptSeq)}`;
        receiptSeq++;
        receiptRows.push({
          id: randomUUID(),
          receiptNo,
          washRecordId: washId,
          items: [
            { name: service.name, price: service.price },
            ...extras.map((e) => ({ name: e.name, price: e.price })),
          ] as unknown as Prisma.InputJsonValue,
          subtotal,
          discount,
          tax: 0,
          total,
          amountPaid: total,
          changeDue: 0,
          paymentMethod: PAYMENT_METHODS[Math.floor(rng() * 4)],
          status: "PAID",
          issuedById: adminId,
          branchId,
          createdAt: completedAt!,
        });
        const prev = lastVisitByCustomer.get(customer.id);
        if (!prev || completedAt! > prev) lastVisitByCustomer.set(customer.id, completedAt!);
        const prevWash = lastWashByVehicle.get(vehicle.id);
        if (!prevWash || completedAt! > prevWash) lastWashByVehicle.set(vehicle.id, completedAt!);
      }
    }
  }

  // Persist wash records, then receipts, then back-fill last-visit stamps.
  await prisma.washRecord.createMany({ data: washRows });
  await prisma.receipt.createMany({ data: receiptRows });
  console.log(`[seed] ${washRows.length} wash records + ${receiptRows.length} receipts ready`);

  for (const [cid, ts] of lastVisitByCustomer) {
    await prisma.customer.update({ where: { id: cid }, data: { lastVisitAt: ts } });
  }
  for (const [vid, ts] of lastWashByVehicle) {
    await prisma.vehicle.update({ where: { id: vid }, data: { lastWashAt: ts } });
  }
  console.log("[seed] Customer/vehicle activity stamps ready");

  // ---- Inventory movements (initial restock trail) ----
  const movementRows = inventoryRows
    .filter((i) => i.quantityAvailable > 0)
    .map((i, idx) => ({
      id: randomUUID(),
      itemId: i.id,
      type: "RESTOCK" as const,
      quantity: i.quantityAvailable,
      balanceAfter: i.quantityAvailable,
      reason: "Initial stock",
      createdById: adminId,
      branchId,
      createdAt: i.lastRestocked ?? daysAgo(30),
    }));
  await prisma.inventoryMovement.createMany({ data: movementRows });
  console.log(`[seed] ${movementRows.length} inventory movements ready`);

  // ---- Notifications ----
  const notificationRows: Prisma.NotificationCreateManyInput[] = [
    { id: randomUUID(), userId: adminId, title: "3 washes pending", message: "Jobs are waiting at the bay — assign attendants to clear the queue.", type: "INFO", category: "WASH", isRead: false, createdAt: daysAgo(0, 7, 5), branchId },
    { id: randomUUID(), userId: adminId, title: "Wash completed", message: "Chanda Banda · BAE 4521 — receipt issued.", type: "SUCCESS", category: "WASH", isRead: false, createdAt: daysAgo(0, 9, 40), branchId },
    { id: randomUUID(), userId: adminId, title: "Low stock alert", message: "Microfiber Towels are below the reorder level — 24 units remaining.", type: "WARNING", category: "INVENTORY", isRead: false, createdAt: daysAgo(0, 8, 15), branchId },
    { id: randomUUID(), userId: adminId, title: "Out of stock", message: "Glass Cleaner has run out of stock.", type: "ERROR", category: "INVENTORY", isRead: false, createdAt: daysAgo(1, 14, 20), branchId },
    { id: randomUUID(), userId: adminId, title: "Expense approved", message: "Cleaning Chemicals · K2,400.00 approved.", type: "SUCCESS", category: "EXPENSE", isRead: true, readAt: daysAgo(1, 10, 0), createdAt: daysAgo(1, 10, 0), branchId },
    { id: randomUUID(), userId: adminId, title: "Expense pending approval", message: "Generator service · K950.00 is waiting for approval.", type: "INFO", category: "EXPENSE", isRead: true, readAt: daysAgo(1, 16, 0), createdAt: daysAgo(1, 15, 30), branchId },
    { id: randomUUID(), userId: adminId, title: "Daily report ready", message: "Yesterday's summary is available in Reports.", type: "INFO", category: "SYSTEM", isRead: true, readAt: daysAgo(1, 7, 30), createdAt: daysAgo(1, 7, 0), branchId },
    { id: randomUUID(), userId: adminId, title: "New employee added", message: "Martha Sichone joined as Supervisor.", type: "INFO", category: "EMPLOYEE", isRead: true, readAt: daysAgo(2, 9, 0), createdAt: daysAgo(2, 8, 45), branchId },
    { id: randomUUID(), userId: adminId, title: "Backup completed", message: "Automatic nightly backup finished successfully.", type: "SUCCESS", category: "SYSTEM", isRead: true, readAt: daysAgo(2, 6, 10), createdAt: daysAgo(2, 6, 0), branchId },
    { id: randomUUID(), userId: adminId, title: "Shift reminder", message: "Morning shift starts in 30 minutes — 6 attendants on duty.", type: "INFO", category: "REMINDER", isRead: true, readAt: daysAgo(3, 7, 30), createdAt: daysAgo(3, 7, 0), branchId },
    { id: randomUUID(), userId: adminId, title: "Expense rejected", message: "Marketing · K1,500.00 was rejected — outside budget.", type: "WARNING", category: "EXPENSE", isRead: true, readAt: daysAgo(4, 12, 0), createdAt: daysAgo(4, 11, 0), branchId },
    { id: randomUUID(), userId: adminId, title: "Stock restocked", message: "Car Wash Soap restocked — 25,000 ml on hand.", type: "SUCCESS", category: "INVENTORY", isRead: true, readAt: daysAgo(5, 10, 0), createdAt: daysAgo(5, 9, 0), branchId },
  ];
  await prisma.notification.createMany({ data: notificationRows });
  console.log(`[seed] ${notificationRows.length} notifications ready`);

  // ---- Audit logs ----
  const auditRows: Prisma.AuditLogCreateManyInput[] = [
    { id: randomUUID(), userId: adminId, branchId, action: "LOGIN", entity: "Auth", details: { username: "admin" }, ipAddress: "41.223.118.12", createdAt: daysAgo(0, 6, 58) },
    { id: randomUUID(), userId: adminId, branchId, action: "WASH_COMPLETED", entity: "WashRecord", newValue: { reference: "WF-20260806-0001" }, createdAt: daysAgo(0, 9, 40) },
    { id: randomUUID(), userId: adminId, branchId, action: "CUSTOMER_CREATED", entity: "Customer", newValue: { name: "Luyando Mwansa" }, createdAt: daysAgo(1, 11, 20) },
    { id: randomUUID(), userId: adminId, branchId, action: "EXPENSE_APPROVED", entity: "Expense", oldValue: { status: "PENDING" }, newValue: { status: "APPROVED" }, createdAt: daysAgo(1, 10, 5) },
    { id: randomUUID(), userId: adminId, branchId, action: "INVENTORY_ADJUSTED", entity: "InventoryItem", oldValue: { quantityAvailable: 300 }, newValue: { quantityAvailable: 0, type: "ISSUE" }, createdAt: daysAgo(1, 14, 22) },
    { id: randomUUID(), userId: adminId, branchId, action: "SETTINGS_UPDATED", entity: "Settings", newValue: { "receipt.footer": "Thank you for washing with Mig Flares!" }, createdAt: daysAgo(2, 9, 15) },
    { id: randomUUID(), userId: adminId, branchId, action: "EMPLOYEE_CREATED", entity: "Employee", newValue: { name: "Martha Sichone" }, createdAt: daysAgo(2, 8, 45) },
    { id: randomUUID(), userId: adminId, branchId, action: "VEHICLE_CREATED", entity: "Vehicle", newValue: { plateNumber: "BAA 9991" }, createdAt: daysAgo(3, 12, 30) },
    { id: randomUUID(), userId: adminId, branchId, action: "LOGIN", entity: "Auth", details: { username: "admin" }, ipAddress: "102.164.90.7", createdAt: daysAgo(3, 7, 12) },
    { id: randomUUID(), userId: adminId, branchId, action: "PASSWORD_CHANGED", entity: "User", createdAt: daysAgo(4, 16, 40) },
    { id: randomUUID(), userId: adminId, branchId, action: "EXPENSE_REJECTED", entity: "Expense", oldValue: { status: "PENDING" }, newValue: { status: "REJECTED" }, createdAt: daysAgo(4, 11, 2) },
    { id: randomUUID(), userId: adminId, branchId, action: "LOGOUT", entity: "Auth", ipAddress: "41.223.118.12", createdAt: daysAgo(4, 18, 30) },
    { id: randomUUID(), userId: adminId, branchId, action: "CUSTOMER_UPDATED", entity: "Customer", oldValue: { status: "ACTIVE" }, newValue: { status: "VIP" }, createdAt: daysAgo(5, 10, 15) },
    { id: randomUUID(), userId: adminId, branchId, action: "WASH_COMPLETED", entity: "WashRecord", newValue: { reference: "WF-20260731-0012" }, createdAt: daysAgo(5, 15, 10) },
    { id: randomUUID(), userId: adminId, branchId, action: "RECEIPT_VOIDED", entity: "Receipt", oldValue: { status: "PAID" }, newValue: { status: "VOIDED" }, createdAt: daysAgo(6, 13, 50) },
  ];
  await prisma.auditLog.createMany({ data: auditRows });
  console.log(`[seed] ${auditRows.length} audit logs ready`);

  console.log("[seed] Done ✔");
  console.log("[seed] Sign-in: admin / admin123 · manager / manager123 · cashier / cashier123");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
