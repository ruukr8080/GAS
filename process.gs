function generateAndCopyCode() {
  const urlInput = document.getElementById("WEB_APP_URL").value.trim();
  const statusDiv = document.getElementById("statusMessage");

  if (!urlInput) {
    console.warn("새로운 Web App URL이 입력되지 않았습니다.");
    alert("새로운 Web App URL을 입력해 주세요!");
    return;
  }

  const fullCode = `(function () {
  const WEB_APP_URL = "${urlInput}";
  const itemProperties = [];
  `;
  // 최신 클립보드 API를 이용하여 복사 수행
  navigator.clipboard
    .writeText(fullCode)
    .then(() => {
      statusDiv.innerText =
        "코드가 클립보드에 복사되었습니다! 알리 콘솔창에 붙여넣으세요.";
      statusDiv.style.display = "block";

      // 3초 뒤 성공 메시지 숨김
      setTimeout(() => {
        statusDiv.style.display = "none";
      }, 3000);
    })
    .catch((err) => {
      console.error("복사 실패:", err);
      alert("클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    });
}
