// 파일명: Code.gs

function doGet(e) {
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("Ali-GAS")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  // 기존의 복잡한 로직을 모두 제거하고, api_ 컨트롤러 함수로 책임을 위임합니다.
  return api_handleOrderPost(e);
}
