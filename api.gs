// 파일명: api_OrderController.gs

function api_handleOrderPost(e) {
  try {
    // 1. 요청 페이로드 파싱 (기존 doPost 상단 로직)
    const res = JSON.parse(e.postData.contents);
    const data = res.data;

    // 2. 수신 데이터 규격 검증 (신규 추가 방어 로직)
    // 클라이언트에서 데이터가 없거나 배열 형식이 아니면 에러를 던져 시트 오염을 방지합니다.
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(
        "유효하지 않은 데이터 규격입니다. 배열 형태의 데이터를 전송해 주세요.",
      );
    }

    // 3. 핵심 비즈니스 로직 호출 (다음 단계에서 구성할 파일)
    // 기존 doPost의 중간에 있던 시트 조회, 중복 검사 로직을 svc_ 함수에서 처리합니다.
    const result = svc_processOrders(data);

    // 4. 정상 응답 반환 (기존 doPost 하단 로직)
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // 5. 에러 응답 반환
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.toString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
