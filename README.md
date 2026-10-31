# NUXNUX 블로그

Astro + CSS + 일반 JavaScript로 구성한 정적 블로그입니다. React·Vue나 직접 작성하는 TypeScript 타입 선언은 사용하지 않습니다. 기존 디자인과 글 URL을 유지합니다.

## 실행

Node.js **22.22 이상**이 필요하며, 배포는 Node.js 24를 사용합니다.

```powershell
cd D:\Project\GithubBlog
npm ci --ignore-scripts
npm run dev
```

[로컬 화면](http://127.0.0.1:8765/)에서 초안까지 확인합니다. **Markdown·CSS·JavaScript·Astro 파일 저장 시 자동 갱신**되므로 매번 서버를 재시작하지 않아도 됩니다. 개발 서버는 로컬 루프백에만 열립니다.

```powershell
npm test                # 실제 글과 독립된 테스트용 데이터로 검증
npm run build:preview   # 초안 포함 → .preview/
npm run build           # 발행 글만 → dist/
npm run preview         # dist/ 확인 (build를 먼저 실행)
```

## 글 작성

1. `templates/post.md`를 복사해 `src/content/posts/영문-slug.md`를 만듭니다.
2. 파일 상단의 제목·요약·연재·태그와 Markdown 본문을 작성합니다.
3. 검토 후 `draft: false`와 실제 발행일을 설정합니다.

```markdown
---
title: "Containerd와 Cilium의 역할"
summary: "컨테이너 실행과 네트워크 연결의 역할을 구분합니다."
series: msa
tags: [Kubernetes, Linux]
draft: true
date: null
---

## 문제 상황

본문을 작성합니다.
```

- **posts.json 등록은 없습니다.** 폴더의 Markdown 파일을 자동 수집합니다.
- 파일명은 영문 소문자·숫자·하이픈입니다. `containerd-cilium.md`의 주소는 `/posts/containerd-cilium/`입니다. 공개 후 파일명은 유지하세요.
- 연재는 `promotion`(프로모션), `msa`(운영 문제), `nubo`(누보), `bbibik`(삐빅), `streaming`(스트리밍 연구) 중 선택합니다. 기존 운영 문제 글과 주소의 호환성을 위해 `msa` ID는 유지합니다.
- 발행일은 `date: "2026-10-18"` 형식으로 실제 날짜를 입력합니다. 예약 발행 기능이 아니며, 저장만으로 외부에 발행되지는 않습니다.
- 발행 글의 제목·요약·연재·태그·날짜·본문을 검증합니다. 날짜 없는 발행 글은 빌드되지 않습니다.
- `promotion-start.md`는 발행 상태이며, 나머지 연재의 첫 글 4개는 로컬 검토용 초안입니다. 이 네 파일은 `.gitignore`로 원격 업로드에서도 제외합니다. 발행하려면 해당 제외 항목을 제거하고 `draft: false`와 발행일을 지정합니다. 선택 항목 `order`는 같은 날짜의 목록 순서를 지정하며 생략할 수 있습니다.
- 첫 `# 제목`은 중복하지 않도록 제거하고 `##`·`###`로 목차를 생성합니다. 코드·표·이미지를 지원하고 실행 가능한 HTML은 제거합니다.

이미지는 `src/content/images/`에 넣고 아래처럼 참조합니다. 실제 본문에서 사용하는 이미지만 배포됩니다.

```markdown
![패킷 전달 경로](../images/packet-flow.png)
```

PDF 첨부는 `src/content/attachments/`에 넣고 본문에서 상대 경로로 연결합니다. 공개 글에서 실제 참조한 PDF만 배포하며, 개발 화면에서도 같은 경로로 다운로드할 수 있습니다.

```markdown
[제안요청서 PDF 다운로드](../attachments/promotion-operations-rfp-v1.1.pdf)
```

첨부 링크는 `.pdf`만 허용합니다. 초안에서만 참조하거나 사용하지 않는 파일은 공개 사이트로 복사하지 않습니다. 공개 저장소에 PDF 원본을 커밋하면 사이트 포함 여부와 관계없이 원문은 공개되므로, 업로드할 파일을 먼저 확인합니다.

연재의 대표 이미지는 글의 `series` 값에 따라 본문 표지와 목록 썸네일에 자동으로 붙습니다. Markdown에 같은 이미지를 다시 넣을 필요는 없습니다. 연재 이미지와 대체 텍스트는 `src/data/navigation.js`에서 바꿉니다.

**주의: draft는 사이트에서만 제외합니다. 공개 저장소에 커밋한 원문은 공개됩니다.** 비공개 AWS·조직·환경 정보는 커밋하지 마세요. `public/`의 파일은 모두 배포됩니다. 초안 미리보기의 noindex는 접근 제어가 아닙니다.

## 코드 수정 위치

| 위치 | 역할 |
| --- | --- |
| `src/pages/index.astro` | 홈 구성 |
| `src/pages/posts/[slug].astro` | 글 본문 화면·개별 URL |
| `src/layouts/SiteLayout.astro` | 공통 HTML·메타데이터·헤더·푸터 |
| `src/components/` | 연재 표지·목록·목차 등 화면 부품 |
| `src/styles/` | 기본·홈·목록·본문·반응형·효과 CSS |
| `src/scripts/` | 검색·홈/연재 전환·테마·코드 복사 |
| `src/content/posts/` | **실제 작성하는 글** |
| `src/content/images/` | 본문 이미지 |
| `src/content/attachments/` | 본문에서 다운로드할 PDF 첨부 |
| `src/data/site.json` | 이름·작성자·도메인 |
| `src/data/navigation.js` | 다섯 연재의 순서·이름·기술 분류·소개 문장·표지 경로, INDEX 목록 |
| `src/data/views.json` | 추후 실제 조회수 데이터 |
| `src/lib/` | 글 검증·Markdown 변환·안전한 경로 처리 |
| `public/assets/` | 다섯 연재 표지의 SVG 파일 |
| `templates/post.md` | 새 글 양식 (발행 대상 아님) |
| `astro.config.mjs` | 정적 빌드·하위 경로·개발 화면 갱신 |
| `scripts/` | 개발·빌드 실행 명령 |
| `tests/` | 단위·실제 Astro 빌드 테스트 |

`dist/`, `.preview/`, `.astro/`는 생성물이므로 편집하지 않습니다.

홈 상단은 **옆 연재 표지가 일부 보이는 가로 스크롤**입니다. 한 연재의 폭을 데스크톱에서 62%, 좁은 화면에서는 80~88%로 두어 다음 연재가 있다는 것을 드러냅니다. 터치·트랙패드 가로 스크롤, 이전/다음 화살표, 이름이 표시된 선택 버튼으로 넘기며 자동 재생하지 않습니다. 방향키·Home·End로도 이동할 수 있고, 동작 줄이기 설정에서는 즉시 바뀝니다. 선택된 연재의 표지 또는 '연재 읽기'를 누르면 해당 글 목록으로 이동합니다. 끝에서는 멈추며 무한 순환하지 않습니다.

홈 아래 **INDEX**의 주제명을 선택하면 해당 태그의 글 목록으로 이동합니다. 연재/INDEX로 돌아가기와 브라우저 뒤로 가기는 선택 항목과 스크롤 위치를 복원합니다. 글이 없는 연재·주제는 빈 목록으로 안내하며, 예전 초안 URL은 더 이상 생성하지 않습니다. 연재 선택 동작은 `src/scripts/series-spotlight.js`, INDEX는 `src/components/HomeIndex.astro`에서 수정합니다.

연재 표지는 1200×600의 직접 편집 가능한 SVG입니다. 프로모션은 `public/assets/series-promotion-title-v1.svg`의 밝은 회색 배경 중앙에 `Promotion 개발기`만 배치합니다. 나머지 네 연재는 `public/assets/series-*-editorial.svg`에서 실패와 재시도·추적, 문서 검색과 근거 연결, 주차 상태 감지와 알림, 방송·회의의 두 전송 경로를 표현합니다. 구현 상세도가 아닌 연재 주제의 개념도입니다. 표지와 상단 여백을 줄여 첫 화면에 기술 분류와 제목이 함께 보이도록 구성했습니다. 홈은 이미지 아래 기술 분류, 명조체 제목, 짧은 문장, 이름이 표시된 연재 선택 메뉴를 사용합니다. 페이지 배경은 흰색/검은색이며 표지의 색은 테마 전환 시에도 유지됩니다. 제목은 `--display-font`, 기술 분류는 `--technical-font`, 본문은 `--font`로 분리하며 외부 폰트를 요청하지 않습니다. 이전 표지는 보존했지만 현재 화면에서는 사용하지 않습니다. 발행 전에는 홈에 가짜 최근 글 목록을 표시하지 않습니다.

프로모션 첫 글의 유머 삽화 2장은 `src/content/images/promotion-*-meme-v2.png`입니다. 선택한 회색 후드·검은 뿔테안경 캐릭터로 통일하며, 캐릭터 기준 이미지는 로컬 `assets/characters/hoodie-character-v1.png`에 보관합니다. 본문에서 상대 경로로 참조하며, 빌드 시 사용하는 이미지만 `media/`로 복사됩니다. 생성 프롬프트는 로컬 `assets/prompts/promotion-article-humor-v2.txt`에 있습니다. 이전 v1 이미지는 보존하되 본문에서 사용하지 않습니다.
이전 구현 파일은 `legacy/blog/`에 보관하며 빌드에서 사용하지 않습니다. `legacy/`는 Git에서 제외됩니다. 사용하지 않는 과거 글 Markdown 23개는 프로젝트 밖의 `D:/Project/GithubBlog-backups/`에 상대 경로를 유지해 백업한 뒤 정리했습니다. 실제 글은 **src/content/posts의 Markdown만 수정**하세요.

홈의 마우스 제스처는 `src/scripts/series-pointer.js`에서 관리합니다. 마우스로 누른 채 좌우로 끌면 표지가 따라오고, 놓으면 연재 단위로 정렬됩니다. 옆에 일부 보이는 연재는 첫 클릭에 메인으로 이동하며, 메인 연재를 다시 클릭하면 글 목록이 열립니다. 드래그 직후의 클릭은 차단하고 터치·트랙패드 스크롤과 Ctrl/⌘+클릭은 브라우저 기본 동작을 유지합니다.

## GitHub Pages

블로그 주소: [hyunmyungchoi.github.io](https://hyunmyungchoi.github.io/)

저장소: [hyunmyungchoi/hyunmyungchoi.github.io](https://github.com/hyunmyungchoi/hyunmyungchoi.github.io), 배포 브랜치: `main`.

1. 글을 `src/content/posts/`에 작성하고 로컬에서 확인합니다.
2. 발행할 글에 `draft: false`와 발행일을 설정합니다.
3. 해당 글과 필요한 이미지만 골라 커밋합니다. `git add .`로 과거 초안과 자료를 무조건 올리지 마세요.
4. `main`에 push합니다.
5. Actions에서 테스트 → Astro 공개 빌드 → dist 업로드 → 배포 성공을 확인합니다.

초기 설정은 저장소 **Settings → Pages → Source: GitHub Actions**를 사용합니다. 실패한 Actions는 사이트에 반영되지 않으므로, 커밋만 성공했는지와 배포까지 성공했는지를 구분해 확인합니다.

GitHub가 제공하는 도메인과 저장소 하위 경로를 자동 적용합니다. 로컬 검증 시 `SITE_URL=https://example.github.io`, `BASE_PATH=/journal`처럼 환경 변수로 지정할 수 있습니다. 실제 도메인을 모르면 임의로 설정할 필요는 없습니다.

배포 도메인이나 발행 승인된 글이 없으면 배포 명령은 중단합니다. PR은 테스트·빌드만 수행합니다. 초안은 공개 HTML·사이트맵·검색 데이터에 포함되지 않습니다.

GitHub 공식 안내상 push 후 사이트 반영에는 최대 10분이 걸릴 수 있습니다. 실제 진행과 승인 대기는 저장소 Actions에서 확인하세요.

## 댓글·조회수

아직 giscus·GoatCounter 계정 연결이나 방문자 추적은 넣지 않았습니다. 발행 글 전체에 유효한 실제 조회수 집계가 있을 때만 가장 많이 읽은 글을 선정하며, 집계가 없으면 대표 글로 표시합니다.

공식 자료: [Astro 컴포넌트](https://docs.astro.build/en/basics/astro-components/), [일반 JavaScript](https://docs.astro.build/en/guides/client-side-scripts/), [GitHub Pages 배포](https://docs.astro.build/en/guides/deploy/github/), [배포 반영 시간](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site#viewing-your-published-site).
