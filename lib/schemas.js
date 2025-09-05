import { z } from 'zod';

export const InventoryItemSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  supplier: z.string().optional().nullable().transform(v => v || ''),
  purchaseDate: z.union([z.date(), z.string().datetime()]).optional(),
  expiryDate: z.union([z.date(), z.string().datetime()]).nullable().optional(),
  notes: z.string().optional().nullable().transform(v => v || ''),
  status: z.enum(['healthy','low','critical','out_of_stock']).optional()
});

export const FeedingLogSchema = z.object({
  foodType: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  cowGroup: z.string().min(1),
  feedingTime: z.union([z.date(), z.string().datetime()]).optional(),
  wastage: z.number().min(0).optional(),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

export const SupplierSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().nullable().transform(v => v || ''),
  address: z.string().optional().nullable().transform(v => v || ''),
  foodTypes: z.array(z.string()).optional().default([]),
  rating: z.number().min(1).max(5).optional().default(3),
  isActive: z.boolean().optional().default(true),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

export const FeedingScheduleSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  cowGroup: z.string().min(1),
  foodType: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  isActive: z.boolean().optional().default(true),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

// Goshala Manager: Herd/Cow schema
export const CowSchema = z.object({
  tagId: z.string().min(1),
  name: z.string().min(1).optional().nullable(),
  category: z.enum(['cow','calf','bull']).default('cow'),
  status: z.enum(['milking','pregnant','sick','rescued','normal']).default('normal'),
  breed: z.string().optional().nullable(),
  birthDate: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  adoptionStatus: z.enum(['none','sponsored','adopted']).default('none'),
  notes: z.string().optional().nullable().transform(v => v || ''),
  dailyMilkYield: z.number().min(0).optional(),
  group: z.string().optional().nullable().transform(v => v || ''),
  pregnant: z.boolean().optional(),
  photoUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

// Health & Veterinary schemas
export const VaccinationSchema = z.object({
  tagId: z.string().min(1),
  vaccine: z.string().min(1),
  scheduledAt: z.union([z.date(), z.string().datetime()]),
  doneAt: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  vet: z.string().optional().nullable().transform(v => v || ''),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

export const TreatmentSchema = z.object({
  tagId: z.string().min(1),
  diagnosis: z.string().min(1),
  illnessCategory: z.enum(['fever','infection','digestive','injury','respiratory','skin','reproductive','other']).optional(),
  startedAt: z.union([z.date(), z.string().datetime()]),
  endedAt: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  vet: z.string().optional().nullable().transform(v => v || ''),
  medicine: z.string().optional().nullable().transform(v => v || ''),
  dosage: z.string().optional().nullable().transform(v => v || ''),
  durationDays: z.number().int().min(0).optional(),
  status: z.enum(['active','completed']).default('active'),
  notes: z.string().optional().nullable().transform(v => v || ''),
  outcome: z.enum(['Recovered','Ongoing','Referred','Deceased']).optional(),
  attachments: z.array(z.object({ url: z.string().url(), type: z.string().optional(), name: z.string().optional() })).optional().default([]),
  followUps: z.array(z.object({ when: z.union([z.date(), z.string().datetime()]), notes: z.string().optional().nullable().transform(v => v || ''), status: z.enum(['scheduled','done']).default('scheduled') })).optional().default([]),
  flags: z.array(z.enum(['NeedsAdminAttention','DietAdjustment'])).optional().default([]),
});

export const MedicineSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  expiryDate: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

// Finance & Donations
export const ExpenseSchema = z.object({
  date: z.union([z.date(), z.string().datetime()]),
  category: z.enum(['fodder','medicine','staff','utilities','maintenance','other']).default('other'),
  amount: z.number().min(0),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

export const DonationSchema = z.object({
  date: z.union([z.date(), z.string().datetime()]),
  donorName: z.string().min(1),
  donorEmail: z.string().email().optional().nullable().transform(v => v || ''),
  amount: z.number().min(0),
  cowTagId: z.string().optional().nullable(),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

// Staff & Operations
export const AttendanceSchema = z.object({
  date: z.union([z.date(), z.string().datetime()]),
  staffId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['Watchman','Food Manager','Caretaker','Vet','Other']).default('Other'),
  status: z.enum(['present','absent','leave']).default('present'),
  checkIn: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  checkOut: z.union([z.date(), z.string().datetime()]).optional().nullable(),
});

export const ShiftSchema = z.object({
  date: z.union([z.date(), z.string().datetime()]),
  staffId: z.string().min(1),
  name: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().optional().nullable().transform(v => v || ''),
});

export const TaskSchema = z.object({
  createdAt: z.union([z.date(), z.string().datetime()]).optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable().transform(v => v || ''),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().optional().nullable(),
  dueDate: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  status: z.enum(['open','in_progress','done']).default('open'),
});

// Infrastructure & Maintenance
export const ChecklistItemSchema = z.object({
  date: z.union([z.date(), z.string().datetime()]),
  area: z.enum(['shed','water','electricity','storage','fence','other']).default('other'),
  item: z.string().min(1),
  status: z.enum(['ok','issue']).default('ok'),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

export const MaintenanceLogSchema = z.object({
  date: z.union([z.date(), z.string().datetime()]),
  component: z.string().min(1),
  action: z.string().min(1),
  cost: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

export const AssetSchema = z.object({
  type: z.enum(['equipment','vehicle','utensil']).default('equipment'),
  name: z.string().min(1),
  identifier: z.string().min(1),
  condition: z.enum(['good','needs_service','broken']).default('good'),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

// Doctor: Appointments
export const AppointmentSchema = z.object({
  when: z.union([z.date(), z.string().datetime()]),
  tagId: z.string().min(1),
  reason: z.string().min(1),
  vet: z.string().min(1),
  notes: z.string().optional().nullable().transform(v => v || ''),
  status: z.enum(['scheduled','completed','cancelled']).default('scheduled'),
});

// Doctor medicines domain
export const DoctorMedicineSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['antibiotics','analgesic','anti-inflammatory','vitamins','vaccines','deworming','probiotic','other']).default('other'),
  unit: z.string().min(1),
  minStock: z.number().min(0).default(0),
  notes: z.string().optional().nullable().transform(v => v || ''),
});

export const DoctorMedicineBatchSchema = z.object({
  medId: z.string().min(1),
  batchCode: z.string().min(1),
  receivedAt: z.union([z.date(), z.string().datetime()]).optional(),
  expiryDate: z.union([z.date(), z.string().datetime()]).optional().nullable(),
  qty: z.number().min(0),
  unit: z.string().min(1),
  supplierId: z.string().optional().nullable(),
  costPerUnit: z.number().min(0).optional().default(0),
});

export const DoctorMedicineUseSchema = z.object({
  medId: z.string().min(1),
  qty: z.number().min(0.001),
  unit: z.string().min(1),
  tagId: z.string().min(1),
  treatmentId: z.string().optional().nullable(),
});

export const DoctorMedicineWastageSchema = z.object({
  medId: z.string().min(1),
  batchCode: z.string().min(1),
  qty: z.number().min(0.001),
  unit: z.string().min(1),
  reason: z.enum(['expired','broken','wasted','other']).default('other'),
});


