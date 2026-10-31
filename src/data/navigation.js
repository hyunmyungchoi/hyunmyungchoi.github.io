export const series = [
  {
    id: 'promotion', title: '판매자를 위한 프로모션 서비스 개발기', shortTitle: '프로모션', disciplines: ['백엔드', '도메인 설계', '정합성'],
    sentence: '할인 설정부터 쿠폰 사용과 취소, 판매자 비용 추적까지.',
    cover: 'assets/series-promotion-title-v1.svg', imageAlt: '밝은 회색 배경 중앙에 Promotion 개발기가 적힌 표지',
  },
  {
    id: 'msa', title: '서비스 운영 문제 재현과 개선', shortTitle: '운영 문제', disciplines: ['장애 재현', '분산 시스템', '관측성'],
    sentence: '문제를 재현하고, 구성을 바꾸고, 같은 조건에서 다시 확인합니다.',
    cover: 'assets/series-operations-editorial.svg', imageAlt: '요청·서비스·저장소 사이의 실패 지점과 재시도, 추적 경로를 그린 개념도',
  },
  {
    id: 'nubo', title: 'AI 주거지원 서비스 누보 개발기', shortTitle: '누보', disciplines: ['AI', '정보 검색', '데이터 처리'],
    sentence: '내 조건에 맞는 공고를 찾고, 신청 준비로 이어갑니다.',
    cover: 'assets/series-nubo-editorial.svg', imageAlt: '공고 문서에서 정보를 검색하고 근거를 답변으로 연결하는 주거지원 서비스 개념도',
  },
  {
    id: 'bbibik', title: '주차 알림 앱 삐빅 개발기', shortTitle: '삐빅', disciplines: ['모바일', '상태 감지', '알림'],
    sentence: '주차와 일시 정차를 구분하고, 필요한 순간에 알립니다.',
    cover: 'assets/series-bbibik-editorial.svg', imageAlt: '이동·정차·주차 상태와 시간 신호가 휴대전화 알림으로 이어지는 개념도',
  },
  {
    id: 'streaming', title: '비디오 스트리밍 시스템 연구', shortTitle: '스트리밍', disciplines: ['미디어 전송', 'SFU', '성능 분석'],
    sentence: '방송과 화상회의의 전송 구조를 구현하고 성능을 비교합니다.',
    cover: 'assets/series-streaming-editorial.svg', imageAlt: 'RTMP·FFmpeg·HLS/DASH 방송 경로와 WebRTC·SFU 회의 경로를 나란히 그린 개념도',
  },
];

export const seriesNames = Object.fromEntries(series.map(item => [item.id, item.title]));
export const topics = ['Docker', 'Kubernetes', 'AWS', 'Linux', '분산 시스템', 'PostgreSQL', 'Video Streaming', 'Product', 'LLM'];
