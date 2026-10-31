---
title: "본문 테스트"
summary: "정적 본문 생성 검증"
series: msa
tags: [Linux]
draft: false
date: "2026-01-02"
---

# 중복되면 안 되는 제목

## 코드

```bash
printf 'hello, blog\n'
```

## 표와 이미지

| 구성 | 역할 |
| --- | --- |
| Markdown | 원문 |

![작성 예제](../../../src/content/images/example.svg)

### 관련 내용

- 첫 번째 항목
- 두 번째 항목

<script>alert('unsafe')</script>

<a href="javascript:alert(1)" onclick="alert(1)">안전하지 않은 HTML</a>
