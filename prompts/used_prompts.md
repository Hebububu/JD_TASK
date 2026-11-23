# 사용한 주요 프롬프트

- **AI 도구:** Claude Code (Claude Opus 5.5), Claude Code CLI, gstack 스킬(`/office-hours`, `/qa`)을 함께 사용했습니다.
- **진행 방식:** 설계를 먼저 합의하고, 단계별로 구현·검증한 뒤, 단계마다 커밋했습니다.

프롬프트는 실제로 입력한 문장 그대로 옮겼습니다. 결과는 매번 직접 실행해서 확인했고, 틀린 부분은 다시 지시해서 고쳤습니다.

---

## 1. 설계 논의

> 사용한 프롬프트: /office-hours we're gonna implement simple TODO API. use NestJS with TypeScript, Prisma as ORM, and SQLite3 for database, Testing for Jest. Let's construct basic struct and discuss.

AI가 목적을 물어서 "Task for Job Interview"라고 답했고
구현할 엔드포인트 목록을 다음과 같이 제시했습니다.

> 사용한 프롬프트: This is the API endpoints that we should implement
```
USER SCOPE API
POST /users/signup
POST /users/login (returns access_token)
GET /users/me (get user info, needs to be authenticated)
PUT /users/me
DELETE /users/me

TODO SCOPE API (Authenticated user only)
POST /todos
GET /todos
GET /todos/{id}
GET /todos/search?keyword=
PUT /todos/{id}
DELETE /todos/{id}
```

- **AI의 제안:**
  - 스펙에 없는 규칙 7가지를 전제로 제시했습니다. 예를 들어 다른 사용자의 TODO는 403이 아니라 404를 반환하고, `/todos/search`를 `/todos/:id`보다 먼저 선언하는 것입니다.
  - 구조 후보 3가지(최소 구성, 기능 모듈 분리, 리포지토리 패턴)를 비교했습니다.
- **선택:** 기능 모듈 분리(`auth`/`users`/`todos`/`prisma`/`common`)를 골랐습니다.
- **검증:**
  - 별도의 AI 리뷰어가 설계 문서를 다시 검토해서 실제로 실행하면 실패할 문제 4개를 찾았습니다.
    1. `.env` 없이 앱이 부팅되지 않습니다.
    2. `prisma generate`를 실행하는 단계가 없습니다.
    3. e2e 테스트 파일이 병렬로 실행되면 서로의 DB 데이터를 지웁니다.
    4. 비밀번호를 응답에서 빼는 방법이 정해져 있지 않습니다.
  - 이 네 가지를 설계에 반영했습니다.
- **수정 지시:**
  > 1. 사용한 프롬프트: add Prettier setup as minimal as possible 2. about user data, use id and password field only.
  - 포매팅을 위한 Prettier를 적용하고, 간단한 설정을 넣었습니다.
  - 사용자 모델을 `{ id, password }`로 줄였습니다. 이 "id"가 로그인 아이디인지 숫자 키인지 AI가 다시 물어서, "사용자가 정하는 로그인 아이디, 가입 후 변경 불가"로 확정했습니다.

## 2. 구현

> 사용한 프롬프트: Start scaffolding

- **AI가 먼저 찾아 알려 준 문제:**
  - NestJS 12 CLI는 기본값이 ESM + Vitest라서, Jest를 쓰기 위해 `--type cjs`로 생성했습니다.
  - Prisma 7은 드라이버 어댑터와 ESM 클라이언트가 필요해 Jest 호환 위험이 있으므로 Prisma 6으로 고정했습니다.
  - `bcrypt`는 네이티브 빌드가 실패할 수 있어 순수 JS인 `bcryptjs`로 바꿨습니다.
- **검증:**
  - 타입 체크에서 나온 `TS1272` 오류(데코레이터 파라미터 타입의 import 방식)와 lint 경고 2개를 고쳤습니다.
  - 테스트가 정말 버그를 잡는지 확인하려고, 소유자 필터(`userId`)를 일부러 제거했더니 격리 테스트가 실패했습니다. 원복하자 다시 통과했습니다.
  - 새 폴더에 clone한 뒤 README 명령어만으로 설치, 마이그레이션, 테스트 전체가 통과하는 것을 확인했습니다.
  - 빌드된 서버를 띄워 curl로 회원가입 → 로그인 → TODO 생성 → 검색 → 탈퇴를 직접 호출해 봤습니다.

## 3. Swagger 문서화

> 사용한 프롬프트: add @nestjs/swagger module and apply

- **배경:** 설계 논의에서 Swagger(`/docs`) 문서화를 포함하기로 했습니다. 그런데 구현이 끝난 뒤 확인해 보니, 문서화 코드는 제대로 작성되지 않은 상태였습니다. 설계대로 구현되지 않은 부분이라 이를 지적했습니다.
- **결과:** AI가 응답 DTO(`UserResponseDto`, `TodoResponseDto` 등), 엔드포인트별 설명, 엔드포인트별 에러 응답(400/401/404/409)을 추가했습니다.
- **검증:**
  - 문서 테스트 4개를 추가했습니다.
    1. 엔드포인트가 모두 문서화되었는지
    2. 모든 엔드포인트에 설명이 있는지
    3. 인증이 필요한 라우트가 인증 필요로 표시되는지
    4. 응답 스키마에 비밀번호 필드가 없는지
  - 브라우저에서 `/docs`가 제대로 보이는지 확인했습니다.

## 4. 필수 테스트 시나리오 정리

> 사용한 프롬프트: let's fix some of @test/users.e2e-spec.ts tests. reorganize test as described the photo

과제 문서의 "테스트 (필수)" 부분을 캡처해서 함께 보냈습니다.

- **결과:**
  - 각 e2e 테스트 파일 맨 위에 `Required scenarios` 블록을 두고, `[Scenario 1]`~`[Scenario 4]`로 번호를 맞췄습니다.
  - 시나리오 1(회원가입 → 로그인 → `/users/me`)은 헬퍼 함수가 중간 단계를 숨기고 있어서, 각 단계를 직접 호출하고 응답을 검증하도록 다시 작성했습니다.
  - 시나리오 2는 생성 → 목록 → 수정 → 삭제를 하나의 흐름으로 만들었습니다.
- **검증:** `npm run test:e2e -- -t Scenario`로 시나리오 테스트 14개만 따로 실행해 모두 통과하는 것을 확인했습니다.

## 5. 과제 문서 전체와 대조 (QA)

> 사용한 프롬프트: /qa now i'll provide full document of the task, check current codebase has been implemented propery. (ignore other requirements beyond code)

과제 문서 전문을 붙여 넣었습니다.

- **방법:** 새 clone에서 README 명령어대로 실행하고, 실제 서버에 HTTP 요청을 보내 요구사항을 하나씩 확인했습니다.
- **발견 1:** 선택 사항인 검색이 과제에는 "제목으로 검색"인데, 구현은 설명(description)까지 검색하고 있었습니다.
  - 먼저 이 버그 때문에 실패하는 테스트를 만들고, 수정한 뒤 통과하는 것을 확인했습니다.
- **발견 2:** README의 버전 요구사항이 부정확했습니다.
  > 사용한 프롬프트: Yes, fix it
  - "Node.js 20+, npm 11" → "Node.js 20.19+, npm 10+"로 고쳤습니다. 의존성이 실제로 요구하는 버전을 읽어서 확인했고, npm 10으로 설치와 테스트를 직접 돌려 봤습니다.
- **정리:**
  > 사용한 프롬프트: delete qa annotation and commit.
  - QA가 테스트 코드에 남긴 주석을 지웠습니다.

## 6. README 정리

> 사용한 프롬프트: translate @README.md as korean, and apply principle on the photo. content of README.md should only contain what the task requirement document says.

- **결과:** 과제가 요구한 네 항목(선택한 스택, 실행 방법, 테스트 실행 방법, API 목록 요약)만 남기고 한국어로 다시 썼습니다.
- **검증:** AI가 처음에는 "e2e 테스트는 아무 준비 없이 바로 실행된다"고 썼습니다. 새 clone에서 확인해 보니 `npm ci`는 먼저 필요해서, 문장을 고치고 `npm ci`만 실행한 상태에서 테스트 전체가 통과하는 것을 확인했습니다.

## 7. `npm ci` 보안 경고

> 사용한 프롬프트: check the issue when i try to npm ci, there's security warnings.

- **원인:** 경고 27건은 모두 개발·CLI 도구에서 나왔습니다. 실행 중인 API 코드와는 관련이 없습니다.
- **되돌린 것:** 작업 트리에 `npm audit fix --force` 방식의 변경이 적용되어 있었습니다. 이 변경은 Prisma CLI를 7로 올려 클라이언트(6)와 버전을 어긋나게 했고, Jest를 29로 내렸으며, high 경고 4건은 그대로 남겼습니다. 그래서 커밋된 상태로 되돌렸습니다.
- **원인별 수정:**
  - 쓰지 않는 배포 도구 `@nestjs/mau`를 제거했습니다.
  - 취약한 하위 의존성은 `overrides`로 패치 버전을 지정했습니다.
- **결과:** npm 11과 npm 10 모두에서 `found 0 vulnerabilities`이고, 빌드·테스트·커버리지가 통과했습니다.
- **후속 질문:**
  > 1. 사용한 프롬프트: Prisma can be updated. should i update it? 2. what's the meaning of @scarf package is not covered by allowScripts
  - Prisma 업데이트 안내는 정식 버전이 아닌 RC(`8.0.0-rc`)여서 업데이트하지 않았습니다.
  - `@scarf/scarf` 경고는 이전 단계에서 AI가 해당 설정을 잘못 지워서 생긴 것이었습니다. 원복한 뒤 경고가 사라진 것을 확인했습니다.

## 8. 커밋

> 사용한 프롬프트: Commit current worktree changes with conventional commit message

단계마다 변경 내용과 이유를 담은 메시지로 커밋하게 했습니다. 커밋 전에는 매번 `git status`로 의도하지 않은 파일이 없는지 확인했습니다.

---
