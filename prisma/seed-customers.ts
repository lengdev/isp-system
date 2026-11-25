#!/usr/bin/env node
/**
 * Deterministic synthetic customer seeder (dev database only).
 *
 * Generates realistic Khmer, Latin, and bilingual ISP subscribers with addresses,
 * subscriptions to existing packages, and PPPoE accounts in transactional batches of 1,000.
 *
 * Usage:
 *   npm run db:seed:customers -- --count=10000 --seed=42 --reset --confirm
 */

import dotenv from 'dotenv';
import {
  CustomerStatus,
  CustomerType,
  Prisma,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client';
import { assertDevDbSafety, resetCustomersDatabase } from '../scripts/reset-customers.ts';

dotenv.config();

const BATCH_SIZE = 1000;

interface NamePair {
  km: string;
  en: string;
}

// 64 curated authentic Khmer given names + matching romanization
const KHMER_GIVEN_NAMES: NamePair[] = [
  { km: 'សុខា', en: 'Sokha' },
  { km: 'បុប្ផា', en: 'Bopha' },
  { km: 'វិរៈ', en: 'Vireak' },
  { km: 'ដារ៉ា', en: 'Dara' },
  { km: 'ចាន់ធី', en: 'Chanthy' },
  { km: 'សុផល', en: 'Sophal' },
  { km: 'រតនា', en: 'Ratana' },
  { km: 'ម៉ាលី', en: 'Maly' },
  { km: 'វណ្ណៈ', en: 'Vannak' },
  { km: 'ភារម្យ', en: 'Phearum' },
  { km: 'កញ្ញា', en: 'Kanha' },
  { km: 'រស្មី', en: 'Reaksmey' },
  { km: 'សំណាង', en: 'Samnang' },
  { km: 'វិបុល', en: 'Vibol' },
  { km: 'នារី', en: 'Nary' },
  { km: 'វិសាល', en: 'Visal' },
  { km: 'ពិសិដ្ឋ', en: 'Piseth' },
  { km: 'សុជាតា', en: 'Socheata' },
  { km: 'បញ្ញា', en: 'Panha' },
  { km: 'ចិត្រា', en: 'Chetra' },
  { km: 'ធីតា', en: 'Thida' },
  { km: 'មុន្នី', en: 'Mony' },
  { km: 'សុខេម', en: 'Sokhem' },
  { km: 'ផល្លា', en: 'Phalla' },
  { km: 'សុធា', en: 'Sothea' },
  { km: 'រាជ', en: 'Reach' },
  { km: 'និមល', en: 'Nimol' },
  { km: 'លក្ខិណា', en: 'Leakhena' },
  { km: 'សុវណ្ណ', en: 'Sovann' },
  { km: 'បូរ៉ា', en: 'Bora' },
  { km: 'ណារ៉ា', en: 'Nara' },
  { km: 'ស្រីនិច្ច', en: 'Sreynich' },
  { km: 'ស្រីល័ក្ខ', en: 'Sreyleak' },
  { km: 'ស្រីមុំ', en: 'Sreymom' },
  { km: 'ស្រីពេជ្រ', en: 'Sreypich' },
  { km: 'គឹមហុង', en: 'Kimhong' },
  { km: 'ចន្ទ្រា', en: 'Chantra' },
  { km: 'ទិត្យ', en: 'Tithya' },
  { km: 'វុទ្ធី', en: 'Vuthy' },
  { km: 'ឧត្ដម', en: 'Oudom' },
  { km: 'មេត្តា', en: 'Meta' },
  { km: 'សុខុម', en: 'Sokhom' },
  { km: 'គន្ធា', en: 'Kunthea' },
  { km: 'វិច្ឆិកា', en: 'Vicheka' },
  { km: 'តារា', en: 'Tara' },
  { km: 'ណារិន', en: 'Narin' },
  { km: 'ម៉ារីណា', en: 'Marina' },
  { km: 'ករុណា', en: 'Karuna' },
  { km: 'រិទ្ធី', en: 'Rithy' },
  { km: 'សីហា', en: 'Seyha' },
  { km: 'ធារ៉ា', en: 'Theara' },
  { km: 'សុភាព', en: 'Sopheap' },
  { km: 'ប្រាកដ', en: 'Prakod' },
  { km: 'មង្គល', en: 'Mongkol' },
  { km: 'សុភា', en: 'Sophea' },
  { km: 'វិជ្ជា', en: 'Vichea' },
  { km: 'រំដួល', en: 'Romduol' },
  { km: 'បូរី', en: 'Borey' },
  { km: 'សុខលាភ', en: 'Sokleap' },
  { km: 'ពិសី', en: 'Pisey' },
  { km: 'វាសនា', en: 'Veasna' },
  { km: 'រីណា', en: 'Rina' },
  { km: 'បូរ៉ាមី', en: 'Boramy' },
  { km: 'សុខហេង', en: 'Sokheng' },
];

// 34 curated Khmer family names + matching romanization
const KHMER_FAMILY_NAMES: NamePair[] = [
  { km: 'ស៊ុន', en: 'Sun' },
  { km: 'ចាន់', en: 'Chan' },
  { km: 'កែវ', en: 'Keo' },
  { km: 'សុខ', en: 'Sok' },
  { km: 'លី', en: 'Ly' },
  { km: 'ហេង', en: 'Heng' },
  { km: 'ពេជ្រ', en: 'Pech' },
  { km: 'នួន', en: 'Noun' },
  { km: 'ម៉ៅ', en: 'Mao' },
  { km: 'ឈុន', en: 'Chhun' },
  { km: 'គង់', en: 'Kong' },
  { km: 'សែម', en: 'Sem' },
  { km: 'តាន់', en: 'Tan' },
  { km: 'ឆេង', en: 'Chheng' },
  { km: 'ភួង', en: 'Phuong' },
  { km: 'ឡុង', en: 'Long' },
  { km: 'មាស', en: 'Meas' },
  { km: 'ឯម', en: 'Em' },
  { km: 'ប៉ែន', en: 'Pen' },
  { km: 'ណុប', en: 'Nop' },
  { km: 'ស៊្រុន', en: 'Srun' },
  { km: 'ខៀវ', en: 'Khiev' },
  { km: 'ពៅ', en: 'Pov' },
  { km: 'ហួន', en: 'Huon' },
  { km: 'ជួន', en: 'Chuon' },
  { km: 'គឹម', en: 'Kim' },
  { km: 'ងួន', en: 'Nguon' },
  { km: 'ប្រាក់', en: 'Prak' },
  { km: 'រស់', en: 'Ros' },
  { km: 'ញ៉ែម', en: 'Nhem' },
  { km: 'សោម', en: 'Som' },
  { km: 'ហ៊ុយ', en: 'Huy' },
  { km: 'យូ', en: 'You' },
  { km: 'ធី', en: 'Thy' },
];

const WESTERN_GIVEN_NAMES = [
  'Alex', 'Claire', 'Marcus', 'Hannah', 'Lucas', 'Nadia', 'Kenji', 'Elena',
  'Liam', 'Priya', 'Daniel', 'Sofia', 'Noah', 'Chloe', 'Ethan', 'Maya',
  'Owen', 'Tessa', 'Julian', 'Naomi',
];

const WESTERN_FAMILY_NAMES = [
  'Mercer', 'Dubois', 'Lindqvist', 'Sato', 'Meyer', 'Patel', 'Takahashi', 'Rostova',
  'Holloway', 'Nair', 'Weber', 'Morales', 'Keller', 'Vance', 'bennett', 'Gauthier',
];

// Complex stacked coeng subscripts, robat, anusvara, triisap, and long Khmer compound names
const KHMER_STACKED_STRESS_PAIRS: Array<{ km: string; en: string; isBusiness?: boolean }> = [
  {
    km: 'ក្រុមហ៊ុន បច្ចេកវិទ្យាព័ត៌មានវិទ្យា និងទូរគមនាគមន៍ អង្គរហ្វាយប័រ',
    en: 'Angkor Fiber Information Technology & Telecom Co., Ltd.',
    isBusiness: true,
  },
  {
    km: 'កញ្ញា ស្រីនាង ច័ន្ទសុវណ្ណារីរ័ត្ន',
    en: 'Sreynang Chansovannaryroath',
  },
  {
    km: 'លោក វណ្ណារិទ្ធិស័ក្តិ អ៊ុង',
    en: 'Vannarithsak Ung',
  },
  {
    km: 'អ្នកស្រី គង់ បុប្ផាស្រីរត្នមុន្នី',
    en: 'Bophasreyroathmony Kong',
  },
  {
    km: 'សណ្ឋាគារ ប្រាង្គអង្គរសុខុមាលភាព អិលធីឌី',
    en: 'Prang Angkor Wellness Hotel Ltd.',
    isBusiness: true,
  },
  {
    km: 'មន្ទីរពិសោធន៍ វិស្វកម្មបណ្ដាញអុបទិក កម្ពុជា',
    en: 'Cambodia Optical Network Engineering Lab',
    isBusiness: true,
  },
  {
    km: 'ច័ន្ទគ្រឹស្នា សុវណ្ណបញ្ញារិទ្ធិ',
    en: 'Chankrisna Sovannpanharith',
  },
  {
    km: 'ព្រីយ៉ា នួនសុខមុន្នីរ័ត្ន',
    en: 'Priya Nounsokmonyroath',
  },
  {
    km: 'សហគ្រាស ពាណិជ្ជកម្មឌីជីថល និងដឹកជញ្ជូនភ្នំពេញ',
    en: 'Phnom Penh Digital Commerce & Logistics Enterprise',
    isBusiness: true,
  },
  {
    km: 'គណៈគ្រប់គ្រង សាលាអន្តរជាតិ ព្រះនរោត្ដមនិមិត្ត',
    en: 'Preah Norodom Nimit International School',
    isBusiness: true,
  },
];

const CITIES_AND_DISTRICTS: Array<{ city: string; district: string; postal: string }> = [
  { city: 'Phnom Penh', district: 'Chamkar Mon (BKK1)', postal: '120101' },
  { city: 'Phnom Penh', district: 'Toul Kork', postal: '120401' },
  { city: 'Phnom Penh', district: 'Sen Sok', postal: '120801' },
  { city: 'Phnom Penh', district: 'Chbar Ampov', postal: '121201' },
  { city: 'Phnom Penh', district: 'Mean Chey', postal: '120601' },
  { city: 'Phnom Penh', district: 'Russey Keo', postal: '120701' },
  { city: 'Siem Reap', district: 'Svay Dangkum', postal: '171202' },
  { city: 'Siem Reap', district: 'Sala Kamraeuk', postal: '171201' },
  { city: 'Battambang', district: 'Svay Por', postal: '021401' },
  { city: 'Sihanoukville', district: 'Sangkat Buon', postal: '180104' },
  { city: 'Kampong Cham', district: 'Veal Vong', postal: '030402' },
  { city: 'Kampot', district: 'Kampong Kandal', postal: '070702' },
];

const STREET_NAMES = [
  'St. 271', 'St. 310', 'St. 598', 'St. 2004', 'National Rd 1',
  'National Rd 6', 'Monivong Blvd', 'Norodom Blvd', 'Russian Conf. Blvd',
  'Wat Bo Rd', 'Pokambor Ave', 'Veng Sreng Blvd',
];

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function deterministicUuid(seed: number, kind: number, index: number): string {
  const part1 = ((seed * 2654435761) >>> 0).toString(16).padStart(8, '0');
  const part2 = ((kind * 40503 + index) & 0xffff).toString(16).padStart(4, '0');
  const part3 = (0x4000 | ((index >>> 16) & 0x0fff)).toString(16).padStart(4, '0');
  const part4 = (0x8000 | ((seed ^ index) & 0x3fff)).toString(16).padStart(4, '0');
  const part5 = ((BigInt(seed + 1) * 1099511628211n + BigInt(index * 17 + kind)) & 0xffffffffffffn)
    .toString(16)
    .padStart(12, '0');
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

function parseArgs() {
  let count = 10000;
  let seed = 42;
  let reset = false;
  let confirm = false;
  let withInvoices = false;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--count=')) {
      count = parseInt(arg.slice('--count='.length), 10);
    } else if (arg.startsWith('--seed=')) {
      seed = parseInt(arg.slice('--seed='.length), 10);
    } else if (arg === '--reset') {
      reset = true;
    } else if (arg === '--confirm') {
      confirm = true;
    } else if (arg === '--with-invoices') {
      withInvoices = true;
    }
  }

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`Invalid --count value: ${count}`);
  }
  if (!Number.isFinite(seed)) {
    throw new Error(`Invalid --seed value: ${seed}`);
  }

  return { count, seed, reset, confirm, withInvoices };
}

async function main() {
  const { count, seed, reset, confirm, withInvoices } = parseArgs();
  const target = assertDevDbSafety(false);
  console.log(
    `Target DB: ${target.host}:${target.port}/${target.dbName} | count=${count} | seed=${seed} | reset=${reset} | withInvoices=${withInvoices}`
  );

  const prisma = new PrismaClient({ log: ['error', 'warn'] });
  const rand = createRng(seed);
  const startMs = Date.now();

  try {
    const existingCount = await prisma.customer.count();
    if (reset) {
      if (existingCount > 0 && !confirm) {
        console.error(
          `REFUSED: Database already has ${existingCount} customers. Re-run with --reset --confirm to wipe first.`
        );
        process.exit(1);
      }
      if (existingCount > 0) {
        await resetCustomersDatabase(prisma, { quiet: true });
        console.log(`Cleared ${existingCount} existing customers before seeding.`);
      }
    }

    const [packages, routers, vlans, existingCustomers] = await Promise.all([
      prisma.package.findMany({ orderBy: { monthlyPrice: 'asc' } }),
      prisma.router.findMany(),
      prisma.vLAN.findMany(),
      prisma.customer.findMany({ select: { code: true } }),
    ]);

    if (packages.length === 0) {
      throw new Error('No packages found in DB. Run npm run db:seed first.');
    }
    if (routers.length === 0) {
      throw new Error('No routers found in DB. Run npm run db:seed first.');
    }

    let maxCodeNum = 1000;
    for (const c of existingCustomers) {
      const m = c.code?.match(/^CUST-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxCodeNum && n < 10_000_000) maxCodeNum = n;
      }
    }

    // Build exact status quota deck (70% Active, 15% Suspended, 10% Pending, 5% Disconnected/Terminated)
    const activeTarget = Math.round(count * 0.7);
    const suspendedTarget = Math.round(count * 0.15);
    const pendingTarget = Math.round(count * 0.1);
    const disconnectedTarget = Math.max(0, count - activeTarget - suspendedTarget - pendingTarget);

    const statusDeck: CustomerStatus[] = [
      ...Array(activeTarget).fill('ACTIVE' as CustomerStatus),
      ...Array(suspendedTarget).fill('SUSPENDED' as CustomerStatus),
      ...Array(pendingTarget).fill('PENDING' as CustomerStatus),
      ...Array(disconnectedTarget).fill('DISCONNECTED' as CustomerStatus),
    ];
    shuffleInPlace(statusDeck, rand);

    // Build exact name-script quota deck (60% BOTH, 20% KM_ONLY, 20% EN_ONLY)
    type NameMode = 'BOTH' | 'KM_ONLY' | 'EN_ONLY';
    const bothTarget = Math.round(count * 0.6);
    const kmOnlyTarget = Math.round(count * 0.2);
    const enOnlyTarget = Math.max(0, count - bothTarget - kmOnlyTarget);

    const modeDeck: NameMode[] = [
      ...Array(bothTarget).fill('BOTH' as NameMode),
      ...Array(kmOnlyTarget).fill('KM_ONLY' as NameMode),
      ...Array(enOnlyTarget).fill('EN_ONLY' as NameMode),
    ];
    shuffleInPlace(modeDeck, rand);

    // Keep first 3 rows cleanly exercising one of each mode + a stacked stress name for deterministic verification
    const stressSamples: Array<{ seq: number; km: string | null; en: string | null }> = [];
    const batchCount = Math.ceil(count / BATCH_SIZE);
    const now = new Date();
    const baseMs = now.getTime();
    const seededCustomerIdsForInvoices: Array<{ id: string; subId: string; planName: string; price: number }> = [];

    for (let b = 0; b < batchCount; b++) {
      const startIdx = b * BATCH_SIZE;
      const endIdx = Math.min(count, startIdx + BATCH_SIZE);

      const customerRows: Prisma.CustomerCreateManyInput[] = [];
      const addressRows: Prisma.CustomerAddressCreateManyInput[] = [];
      const subRows: Prisma.SubscriptionCreateManyInput[] = [];
      const pppoeRows: Prisma.PPPoEAccountCreateManyInput[] = [];

      for (let i = startIdx; i < endIdx; i++) {
        const seqNum = maxCodeNum + 1 + i;
        const code = `CUST-${seqNum}`;
        const customerId = `cust-${seqNum}`;
        const addressId = deterministicUuid(seed, 1, seqNum);
        const subId = deterministicUuid(seed, 2, seqNum);
        const pppoeId = deterministicUuid(seed, 3, seqNum);

        const mode = modeDeck[i];
        const status = statusDeck[i];

        let nameKm: string | null = null;
        let nameEn: string | null = null;
        let custType: CustomerType = 'RESIDENTIAL';
        let companyName: string | null = null;

        const useStress = i < KHMER_STACKED_STRESS_PAIRS.length && mode !== 'EN_ONLY';
        if (useStress) {
          const stress = KHMER_STACKED_STRESS_PAIRS[i % KHMER_STACKED_STRESS_PAIRS.length];
          nameKm = stress.km.normalize('NFC');
          nameEn = mode === 'BOTH' ? stress.en.normalize('NFC') : null;
          if (stress.isBusiness) {
            custType = 'BUSINESS';
            companyName = nameEn || nameKm;
          }
        } else if (i % 45 === 0 && i >= KHMER_STACKED_STRESS_PAIRS.length) {
          const biz = KHMER_STACKED_STRESS_PAIRS[i % KHMER_STACKED_STRESS_PAIRS.length];
          custType = 'BUSINESS';
          if (mode === 'BOTH') {
            nameKm = `${biz.km} (${seqNum})`.normalize('NFC');
            nameEn = `${biz.en} #${seqNum}`.normalize('NFC');
          } else if (mode === 'KM_ONLY') {
            nameKm = `${biz.km} ${seqNum}`.normalize('NFC');
          } else {
            nameEn = `${biz.en} #${seqNum}`.normalize('NFC');
          }
          companyName = nameEn || nameKm;
        } else if (mode === 'EN_ONLY' && rand() < 0.28) {
          const wg = WESTERN_GIVEN_NAMES[Math.floor(rand() * WESTERN_GIVEN_NAMES.length)];
          const wfRaw = WESTERN_FAMILY_NAMES[Math.floor(rand() * WESTERN_FAMILY_NAMES.length)];
          const wf = wfRaw.charAt(0).toUpperCase() + wfRaw.slice(1);
          nameEn = `${wg} ${wf}`.normalize('NFC');
        } else {
          const given = KHMER_GIVEN_NAMES[Math.floor(rand() * KHMER_GIVEN_NAMES.length)];
          const family = KHMER_FAMILY_NAMES[Math.floor(rand() * KHMER_FAMILY_NAMES.length)];
          const kmFull = `${given.km} ${family.km}`.normalize('NFC');
          const enFull = `${given.en} ${family.en}`.normalize('NFC');
          if (mode === 'BOTH') {
            nameKm = kmFull;
            nameEn = enFull;
          } else if (mode === 'KM_ONLY') {
            nameKm = kmFull;
          } else {
            nameEn = enFull;
          }
        }

        const fullName = (nameEn || nameKm || code).normalize('NFC');
        if (stressSamples.length < 25 && (useStress || i < 30)) {
          stressSamples.push({ seq: seqNum, km: nameKm, en: nameEn });
        }

        const domain = i % 3 === 0 ? 'example.test' : 'example.com';
        const slug = (nameEn || `khmer.sub`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '.')
          .replace(/^\.+|\.+$/g, '')
          .slice(0, 24);
        const email = `${slug || 'sub'}.${seqNum}@${domain}`;

        const carrierPrefix = ['12', '17', '77', '89', '98'][i % 5];
        const blockA = 900 + ((Math.floor(i / 1000) * 7 + 1) % 99);
        const blockB = String(i % 1000).padStart(3, '0');
        const phone = `+855 ${carrierPrefix} ${blockA} ${blockB}`;

        const geo = CITIES_AND_DISTRICTS[Math.floor(rand() * CITIES_AND_DISTRICTS.length)];
        const street = STREET_NAMES[Math.floor(rand() * STREET_NAMES.length)];
        const houseNo = Math.floor(rand() * 480) + 1;
        const addressLine = `House ${houseNo}, ${street}, ${geo.district}`;

        const pkg = packages[Math.floor(rand() * packages.length)];
        const router = routers[Math.floor(rand() * routers.length)];
        const matchingVlans = vlans.filter((v) => v.routerId === router.id);
        const vlan = matchingVlans.length > 0 ? matchingVlans[i % matchingVlans.length] : null;

        const regDaysAgo = Math.floor(rand() * 540);
        const regDate = new Date(baseMs - regDaysAgo * 86400 * 1000);
        const nextBill = new Date(baseMs + (1 + Math.floor(rand() * 28)) * 86400 * 1000);

        const subStatus: SubscriptionStatus =
          status === 'ACTIVE'
            ? 'ACTIVE'
            : status === 'SUSPENDED'
            ? 'SUSPENDED'
            : status === 'PENDING'
            ? 'PENDING'
            : 'TERMINATED';

        const ratingVal = Number((3.8 + rand() * 1.2).toFixed(1));
        const ipO2 = 10 + (Math.floor(i / 60000) % 240);
        const ipO3 = Math.floor(i / 240) % 250;
        const ipO4 = (i % 240) + 10;
        const ipAddress = `10.${ipO2}.${ipO3}.${ipO4}`;

        const m4 = ((i >>> 16) & 0xff).toString(16).padStart(2, '0').toUpperCase();
        const m5 = ((i >>> 8) & 0xff).toString(16).padStart(2, '0').toUpperCase();
        const m6 = (i & 0xff).toString(16).padStart(2, '0').toUpperCase();
        const macAddress = `02:4E:53:${m4}:${m5}:${m6}`;

        const pppoeSlug = (nameEn || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 18);
        const pppoeUsername = `${pppoeSlug ? `${pppoeSlug}_` : 'cust_'}${seqNum}_pppoe`;

        customerRows.push({
          id: customerId,
          code,
          type: custType,
          status,
          fullName,
          nameKm,
          nameEn,
          email,
          phone,
          companyName,
          rating: new Prisma.Decimal(ratingVal),
          balanceDue: new Prisma.Decimal(0),
          registrationDate: regDate,
          createdAt: regDate,
        });

        addressRows.push({
          id: addressId,
          customerId,
          addressLine,
          city: geo.city,
          district: geo.district,
          postalCode: geo.postal,
          isPrimary: true,
        });

        subRows.push({
          id: subId,
          subscriptionNumber: `SUB-${seqNum}`,
          customerId,
          packageId: pkg.id,
          routerId: router.id,
          vlanId: vlan?.id ?? null,
          technology: pkg.technology,
          status: subStatus,
          billingCycle: 'MONTHLY',
          monthlyFee: pkg.monthlyPrice,
          activationDate: status === 'PENDING' ? null : regDate,
          nextBillingDate: nextBill,
        });

        pppoeRows.push({
          id: pppoeId,
          username: pppoeUsername,
          passwordHash: 'seeded_pppoe_hash',
          subscriptionId: subId,
          routerId: router.id,
          ipAddress,
          macAddress,
          isActive: status === 'ACTIVE',
          isOnline: status === 'ACTIVE' && rand() < 0.85,
        });

        if (withInvoices && status === 'ACTIVE' && seededCustomerIdsForInvoices.length < 50) {
          seededCustomerIdsForInvoices.push({
            id: customerId,
            subId,
            planName: pkg.name,
            price: Number(pkg.monthlyPrice),
          });
        }
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.customer.createMany({ data: customerRows });
          await tx.customerAddress.createMany({ data: addressRows });
          await tx.subscription.createMany({ data: subRows });
          await tx.pPPoEAccount.createMany({ data: pppoeRows });
        },
        { timeout: 60000 }
      );

      console.log(`Inserted batch ${b + 1}/${batchCount} (${endIdx}/${count} customers)`);
    }

    if (withInvoices && seededCustomerIdsForInvoices.length > 0) {
      const { BillingService } = await import('../dist-server/services/billing.service.js');
      for (const targetCust of seededCustomerIdsForInvoices) {
        await BillingService.generateInvoice({
          customerId: targetCust.id,
          subscriptionId: targetCust.subId,
          billingPeriod: '2026-11',
          items: [{ description: `${targetCust.planName} Monthly Fee`, amount: targetCust.price }],
        });
      }
      console.log(`Generated ${seededCustomerIdsForInvoices.length} sample invoices via BillingService.`);
    }

    // Post-seed verification
    const [totalCustomers, totalAddr, totalSub, totalPppoe, statusCounts, modeStats] =
      await Promise.all([
        prisma.customer.count(),
        prisma.customerAddress.count(),
        prisma.subscription.count(),
        prisma.pPPoEAccount.count(),
        prisma.customer.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.$queryRaw<
          Array<{ both_count: string; km_only: string; en_only: string }>
        >`
          SELECT
            COUNT(*) FILTER (WHERE "nameKm" IS NOT NULL AND "nameEn" IS NOT NULL)::text AS both_count,
            COUNT(*) FILTER (WHERE "nameKm" IS NOT NULL AND "nameEn" IS NULL)::text AS km_only,
            COUNT(*) FILTER (WHERE "nameKm" IS NULL AND "nameEn" IS NOT NULL)::text AS en_only
          FROM "Customer"
        `,
      ]);

    // UTF-8 NFC roundtrip verification on Khmer & stress samples
    const checkCodes = stressSamples.map((s) => `CUST-${s.seq}`);
    const roundtripRows = await prisma.customer.findMany({
      where: { code: { in: checkCodes } },
      select: { code: true, nameKm: true, nameEn: true, fullName: true },
    });
    const roundtripMap = new Map(roundtripRows.map((r) => [r.code, r]));
    for (const s of stressSamples) {
      const row = roundtripMap.get(`CUST-${s.seq}`);
      if (!row) throw new Error(`UTF-8 roundtrip missing row CUST-${s.seq}`);
      if (row.nameKm !== s.km || row.nameEn !== s.en) {
        throw new Error(`UTF-8 roundtrip mismatch at CUST-${s.seq}`);
      }
      if (row.nameKm) {
        const expectedBuf = Buffer.from(row.nameKm.normalize('NFC'), 'utf8');
        if (!Buffer.from(row.nameKm, 'utf8').equals(expectedBuf)) {
          throw new Error(`UTF-8 NFC byte mismatch at CUST-${s.seq}`);
        }
      }
    }

    // Print 20 representative sample rows covering BOTH, KM_ONLY, EN_ONLY, and stacked stress cases
    const [bothSamples, kmSamples, enSamples] = await Promise.all([
      prisma.customer.findMany({
        where: { nameKm: { not: null }, nameEn: { not: null } },
        take: 10,
        orderBy: { code: 'asc' },
        include: {
          addresses: { take: 1 },
          subscriptions: { take: 1, include: { package: true } },
        },
      }),
      prisma.customer.findMany({
        where: { nameKm: { not: null }, nameEn: null },
        take: 5,
        orderBy: { code: 'asc' },
        include: {
          addresses: { take: 1 },
          subscriptions: { take: 1, include: { package: true } },
        },
      }),
      prisma.customer.findMany({
        where: { nameKm: null, nameEn: { not: null } },
        take: 5,
        orderBy: { code: 'asc' },
        include: {
          addresses: { take: 1 },
          subscriptions: { take: 1, include: { package: true } },
        },
      }),
    ]);

    const sampleRows = [...bothSamples, ...kmSamples, ...enSamples].map((c) => ({
      code: c.code,
      status: c.status,
      nameKm: c.nameKm ?? '(null)',
      nameEn: c.nameEn ?? '(null)',
      city: c.addresses[0]?.city ?? '-',
      package: c.subscriptions[0]?.package?.name ?? '-',
      email: c.email,
    }));

    const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(2);
    console.log('\n=== Seeding Summary ===');
    console.log({
      elapsedSec: `${elapsedSec}s`,
      totals: {
        Customer: totalCustomers,
        CustomerAddress: totalAddr,
        Subscription: totalSub,
        PPPoEAccount: totalPppoe,
      },
      statusDistribution: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count._all])
      ),
      nameDistribution: modeStats[0],
      utf8RoundtripChecked: stressSamples.length,
    });

    console.log('\n=== 20 Representative Seeded Customers ===');
    console.table(sampleRows);
    console.log(`\n✓ Seeded ${count} synthetic customers cleanly in ${elapsedSec}s.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n✗ Customer seeder failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
