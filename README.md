# TODO API

## 선택한 스택

**A. NestJS**: TypeScript · NestJS 12 · Prisma 6 · SQLite · Jest

## 실행 방법

Node.js 20.19 이상(또는 22.12 이상)과 npm 10 이상이 필요합니다.

```bash
npm ci                         # 의존성 설치 (prisma generate 자동 실행)
cp .env.example .env           # 환경 변수 파일 생성 (기본값 그대로 사용 가능)
npx prisma migrate deploy      # 마이그레이션 실행: prisma/dev.db에 테이블 생성
npm run start:dev              # http://localhost:3000 에서 실행
```

## 테스트 실행 방법

```bash
npm run test         # 단위 테스트
npm run test:e2e     # E2E 테스트 (필수 시나리오 4가지 포함)
```

E2E 테스트는 `.env`를 사용하지 않고 별도의 테스트용 DB(`test/test.db`)를 자동으로 만들어 실행하므로, `npm ci` 후 바로 실행할 수 있습니다.

## API 목록 요약

인증이 필요한 요청은 `Authorization: Bearer <access_token>` 헤더를 사용합니다.

**사용자**

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/users/signup` | 회원가입 (`{ id, password }`) | – |
| POST | `/users/login` | 로그인, `{ access_token }` 반환 | – |
| GET | `/users/me` | 내 정보 조회 | 필요 |
| PUT | `/users/me` | 회원정보(비밀번호) 수정 | 필요 |
| DELETE | `/users/me` | 회원 탈퇴 | 필요 |

**TODO**: 로그인한 사용자 본인의 TODO만 다룹니다.

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/todos` | 생성 | 필요 |
| GET | `/todos` | 내 목록 조회 | 필요 |
| GET | `/todos/search?keyword=` | 제목으로 검색 | 필요 |
| GET | `/todos/{id}` | 단건 조회 | 필요 |
| PUT | `/todos/{id}` | 수정 | 필요 |
| DELETE | `/todos/{id}` | 삭제 | 필요 |
