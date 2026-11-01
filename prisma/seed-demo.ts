// 로컬 UI 확인용 샘플 숙소·방. 데모 호스트 소유 데이터만 지우고 다시 만든다(재실행 가능).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { approximate } from "../src/modules/listings/approx";

const DEMO_HOST_EMAIL = "demo-host@hometohome.test";

type RoomSeed = {
  name: string;
  roomType: "PRIVATE" | "SHARED" | "STUDIO";
  capacity: number;
  monthlyRent: number;
  deposit: number;
  options: string[];
  status?: "PUBLISHED" | "HIDDEN";
  block?: { startDate: string; endDate: string; reason: string };
};

type PropertySeed = {
  title: string;
  description: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  amenities: string[];
  houseRules: string;
  status?: "PUBLISHED" | "DRAFT";
  rooms: RoomSeed[];
};

const PROPERTIES: PropertySeed[] = [
  {
    title: "Hongdae Creative Share House",
    description: "5 minutes from Hongik Univ. Station. Shared living room and rooftop, popular with students and freelancers.",
    address: "서울특별시 마포구 와우산로 94",
    district: "mapo",
    lat: 37.5519,
    lng: 126.9229,
    amenities: ["rooftop", "shared_lounge", "elevator"],
    houseRules: "Quiet hours 23:00–07:00. No smoking indoors.",
    rooms: [
      { name: "Room A (sunny)", roomType: "PRIVATE", capacity: 1, monthlyRent: 650_000, deposit: 1_000_000, options: ["wifi", "desk", "heating", "air_conditioner"] },
      { name: "Room B (ensuite)", roomType: "PRIVATE", capacity: 1, monthlyRent: 780_000, deposit: 1_000_000, options: ["private_bathroom", "wifi", "desk", "heating", "air_conditioner"] },
      { name: "Shared room C", roomType: "SHARED", capacity: 2, monthlyRent: 420_000, deposit: 500_000, options: ["wifi", "heating", "washer"] },
    ],
  },
  {
    title: "Gangnam Station Studio Residence",
    description: "Fully furnished studios 3 minutes from Gangnam Station. Ideal for business stays.",
    address: "서울특별시 강남구 테헤란로 152",
    district: "gangnam",
    lat: 37.5005,
    lng: 127.0365,
    amenities: ["elevator", "parcel_locker", "gym"],
    houseRules: "No pets. Guests must register visitors at the front desk.",
    rooms: [
      { name: "Studio 301", roomType: "STUDIO", capacity: 1, monthlyRent: 1_350_000, deposit: 3_000_000, options: ["private_bathroom", "wifi", "desk", "air_conditioner", "heating", "washer", "kitchen"] },
      { name: "Studio 502 (balcony)", roomType: "STUDIO", capacity: 2, monthlyRent: 1_600_000, deposit: 3_000_000, options: ["private_bathroom", "wifi", "desk", "air_conditioner", "heating", "washer", "kitchen", "balcony"] },
    ],
  },
  {
    title: "Itaewon Global House",
    description: "Multicultural share house near Itaewon Station with a big shared kitchen.",
    address: "서울특별시 용산구 이태원로 177",
    district: "yongsan",
    lat: 37.5345,
    lng: 126.9946,
    amenities: ["shared_kitchen", "laundry_room"],
    houseRules: "Clean the kitchen after use.",
    rooms: [
      { name: "Garden room", roomType: "PRIVATE", capacity: 1, monthlyRent: 720_000, deposit: 1_000_000, options: ["wifi", "desk", "heating", "kitchen"] },
      { name: "Twin room", roomType: "SHARED", capacity: 2, monthlyRent: 480_000, deposit: 500_000, options: ["wifi", "heating", "kitchen", "washer"],
        block: { startDate: "2027-01-01", endDate: "2027-02-01", reason: "Renovation" } },
    ],
  },
  {
    title: "Bukchon Hanok Stay",
    description: "Traditional hanok rooms in Bukchon, walking distance to Gyeongbokgung.",
    address: "서울특별시 종로구 계동길 37",
    district: "jongno",
    lat: 37.5826,
    lng: 126.9866,
    amenities: ["courtyard", "shared_kitchen"],
    houseRules: "Remove shoes indoors. Quiet neighborhood — keep noise low.",
    rooms: [
      { name: "Hanok room 1", roomType: "PRIVATE", capacity: 1, monthlyRent: 900_000, deposit: 1_500_000, options: ["wifi", "heating", "air_conditioner"] },
      { name: "Hanok room 2", roomType: "PRIVATE", capacity: 2, monthlyRent: 1_100_000, deposit: 1_500_000, options: ["private_bathroom", "wifi", "heating", "air_conditioner"] },
    ],
  },
  {
    title: "Sinchon Student House",
    description: "Budget-friendly rooms between Yonsei and Ewha universities.",
    address: "서울특별시 서대문구 연세로 50",
    district: "seodaemun",
    lat: 37.5585,
    lng: 126.9368,
    amenities: ["study_room", "laundry_room"],
    houseRules: "No parties. Recycling is mandatory.",
    rooms: [
      { name: "Single 1", roomType: "PRIVATE", capacity: 1, monthlyRent: 480_000, deposit: 500_000, options: ["wifi", "desk", "heating"] },
      { name: "Single 2", roomType: "PRIVATE", capacity: 1, monthlyRent: 500_000, deposit: 500_000, options: ["wifi", "desk", "heating", "air_conditioner"] },
      { name: "Quad share", roomType: "SHARED", capacity: 4, monthlyRent: 350_000, deposit: 300_000, options: ["wifi", "heating", "washer"] },
    ],
  },
  {
    title: "Seongsu Loft Living",
    description: "Converted loft near Seoul Forest and Seongsu cafes.",
    address: "서울특별시 성동구 성수이로 78",
    district: "seongdong",
    lat: 37.5446,
    lng: 127.0557,
    amenities: ["rooftop", "bike_storage"],
    houseRules: "No smoking. Bikes in the storage room only.",
    rooms: [
      { name: "Loft A", roomType: "STUDIO", capacity: 1, monthlyRent: 1_150_000, deposit: 2_000_000, options: ["private_bathroom", "wifi", "desk", "air_conditioner", "heating", "kitchen"] },
      { name: "Loft B (hidden)", roomType: "STUDIO", capacity: 1, monthlyRent: 1_200_000, deposit: 2_000_000, options: ["private_bathroom", "wifi", "kitchen"], status: "HIDDEN" },
    ],
  },
  {
    title: "Jamsil Lakeside Residence",
    description: "Quiet residence near Seokchon Lake and Lotte World Tower.",
    address: "서울특별시 송파구 석촌호수로 166",
    district: "songpa",
    lat: 37.5097,
    lng: 127.1003,
    amenities: ["elevator", "parking"],
    houseRules: "Parking by reservation.",
    rooms: [
      { name: "Lake view room", roomType: "PRIVATE", capacity: 1, monthlyRent: 850_000, deposit: 1_500_000, options: ["private_bathroom", "wifi", "desk", "air_conditioner", "heating", "balcony"] },
      { name: "Standard room", roomType: "PRIVATE", capacity: 1, monthlyRent: 700_000, deposit: 1_000_000, options: ["wifi", "desk", "air_conditioner", "heating"] },
    ],
  },
  {
    title: "Draft: Sillim House (unpublished)",
    description: "Draft listing — should not appear in search.",
    address: "서울특별시 관악구 신림로 330",
    district: "gwanak",
    lat: 37.4842,
    lng: 126.9297,
    amenities: [],
    houseRules: "",
    status: "DRAFT",
    rooms: [
      { name: "Draft room", roomType: "PRIVATE", capacity: 1, monthlyRent: 400_000, deposit: 500_000, options: ["wifi"] },
    ],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("seed-demo must not run in production");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const host = await prisma.user.upsert({
      where: { email: DEMO_HOST_EMAIL },
      update: { roles: ["GUEST", "HOST"] },
      create: { email: DEMO_HOST_EMAIL, name: "Demo Host", roles: ["GUEST", "HOST"] },
    });
    // 방은 onDelete: Cascade 로 함께 삭제된다.
    await prisma.property.deleteMany({ where: { hostId: host.id } });

    let rooms = 0;
    for (const p of PROPERTIES) {
      const approx = approximate(p.lat, p.lng);
      await prisma.property.create({
        data: {
          hostId: host.id,
          title: p.title,
          description: p.description,
          address: p.address,
          district: p.district,
          lat: p.lat,
          lng: p.lng,
          approxLat: approx.lat,
          approxLng: approx.lng,
          amenities: p.amenities,
          houseRules: p.houseRules,
          status: p.status ?? "PUBLISHED",
          rooms: {
            create: p.rooms.map((r) => ({
              name: r.name,
              roomType: r.roomType,
              capacity: r.capacity,
              monthlyRent: r.monthlyRent,
              deposit: r.deposit,
              options: r.options,
              photos: [],
              status: r.status ?? "PUBLISHED",
              blocks: r.block
                ? { create: [{ startDate: new Date(`${r.block.startDate}T00:00:00Z`), endDate: new Date(`${r.block.endDate}T00:00:00Z`), reason: r.block.reason }] }
                : undefined,
            })),
          },
        },
      });
      rooms += p.rooms.length;
    }
    console.log(`Seeded ${PROPERTIES.length} demo properties, ${rooms} rooms (host ${DEMO_HOST_EMAIL}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
