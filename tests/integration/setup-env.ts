import { config } from "dotenv";

// 각 테스트 워커에서 DATABASE_URL을 테스트 DB로 고정한다(개발 DB 접근 방지).
config({ quiet: true });
if (!process.env.DATABASE_URL_TEST) throw new Error("DATABASE_URL_TEST is required");
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
