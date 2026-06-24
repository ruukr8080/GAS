
  function generateAndCopyCode() {
    const urlInput = document.getElementById('WEB_APP_URL').value.trim();
    const statusDiv = document.getElementById('statusMessage');

    if (!urlInput) {
      console.warn('새로운 Web App URL이 입력되지 않았습니다.');
      alert('새로운 Web App URL을 입력해 주세요!');
      return;
    }

    const fullCode = `(function () {
  const WEB_APP_URL = "${urlInput}";
  const itemProperties = [];
  // 1. 계정 정보 추출
  let account = "";
  try {
    const accountContainer = document.getElementById("_global_header_23_");
    if (accountContainer) {
      const text = accountContainer.innerText;
      const match = text.match(/Hi,\s*([a-zA-Z0-9_\-]+)/i) || [null, text.trim()];
      account = match[1] ? match[1].trim() : text.trim();
    }
  } catch (e) {
    console.warn("계정 정보를 가져오지 못했습니다:", e);
  }

  // 2. 전체 주문 그룹 탐색
  const checkboxGroup = document.querySelector(".comet-checkbox-group");
  if (!checkboxGroup) {
    alert("주문 목록을 찾을 수 없습니다. 페이지 로딩을 확인해주세요.");
    return;
  }

  const orderItems = checkboxGroup.querySelectorAll(".order-item");

  orderItems.forEach((order) => {
    if (order.offsetParent === null) return; // 숨겨진 엘리먼트 제외

    try {
      let orderId = "";
      let packageNum = "";

      // 주문일자 및 주문번호 추출 주문일자:: 2026년 5월 21일 주문번호:: 1120739318868050
      const header = order.querySelector(".order-item-header");
      if (header) {
        const headerText = header.innerText;
        const idMatch = headerText.match(/(?:주문번호\s*:\s*|Order ID\s*:\s*|)(\d{10,})/i);
        if (idMatch) orderId = idMatch[1];

        const dateMatch = headerText.match(/(\d{4})년\s*(\d+)월\s*(\d+)일/);
        if (dateMatch) {
          const [_, year, month, day] = dateMatch;
          packageNum = year.slice(-2) + month.padStart(2, "0") + day.padStart(2, "0");
        }
      }

      // 초이스 여부 및 판매자명
      let storeInfo = "";
      const storeEl = order.querySelector(".order-item-store");
      if (storeEl) {
        const icon = storeEl.querySelector(".order-item-store-icon");
        const storeNameEl = storeEl.querySelector(".order-item-store-name");

        const storeType = icon ? "Choice" : "none";
        const storeName = storeNameEl ? storeNameEl.innerText.trim() : "none";
        storeInfo = '${storeType} - ${storeName}'.trim();
      }
      // 상품 정보 파싱
      const content = order.querySelector(".order-item-content");
      if (!content) return;

      let title = "";
      const nameEl = content.querySelector(".order-item-content-info-name");
      if (nameEl) title = nameEl.innerText.trim();

      let sku = "";
      const skuEl = content.querySelector(".order-item-content-info-sku");
      if (skuEl) sku = skuEl.innerText.trim();

      let finalPrice = "";
      const finalPriceEl = content.querySelector(".order-item-content-opt-price .es--wrap--1Hlfkoj");
      if (finalPriceEl) finalPrice = finalPriceEl.innerText.replace(/[^0-9]/g, "");

      let quantity = "1";
      const qtyEl = content.querySelector(".order-item-content-info-number-quantity");
      if (qtyEl) {
        const parsedQty = qtyEl.innerText.replace(/[^0-9]/g, "");
        if (parsedQty) quantity = parsedQty;
      }

      let imgSrc = "";
      const imgEl = content.querySelector(".order-item-content-img");
      if (imgEl && imgEl.style.backgroundImage) {
        const imgElMatch = imgEl.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (imgElMatch) {
          imgSrc = imgElMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/"/g, "")
            .trim();
        }
      }

      let itemState = "";
      let refundAmount = "";
      const bottomAction = order.querySelector(".order-item-bottom-action");

      if (bottomAction) {
        const stateTitleEl = bottomAction.querySelector(".expose-info-item-title");
        if (stateTitleEl) {
          const stateText = stateTitleEl.innerText.trim();

          // 금액(span) 텍스트 미리 추출
          const amountSpan = stateTitleEl.querySelector("span");
          const amountText = amountSpan ? '${amountSpan.innerText.trim()}' : "";

          // 조건별 매칭을 위한 switch (true) 패턴
          switch (true) {
            case stateText.includes("피드백을 기다리는 중입니다"):
              itemState = "대기";
              break;

            case stateText.includes("고급 환불 완료"):
              itemState = "고급 환불";
              refundAmount = amountText;
              break;

            case stateText.includes("환불 완료"):
              itemState = "환불";
              refundAmount = amountText;
              break;

            case stateText.includes("요청 완료"):
              itemState = "요청 완료";
              refundAmount = amountText;
              break;

            default:
              itemState = stateText;
              break;
          }
        }
      }

      // 오브젝트 빌드업 및 배열 추가
      if (title && orderId) {
        itemProperties.push({
          packageNum: packageNum, //a 
          account: account, // b
          title: title, // c
          sku: sku, // d
          empty: "", // e
          finalPrice: finalPrice, // f
          imgSrc: imgSrc, // g
          orderId: orderId, // h
          quantity: quantity, // i
          itemState: itemState, // j
          refundAmount: refundAmount, // k
          storeInfo: storeInfo, // l
        });
      }
    } catch (err) {
      console.warn("개별 아이템 파싱 중 오류 발생:", err);
    }
  });

  console.log("수집한 데이터 (" + new Date() + "):\n" + JSON.stringify(itemProperties, null, 2));
  
  if (itemProperties.length === 0) {
    alert(" 수집항목 0" + "\n" + "반응형 웹 특성상 파싱할 태그 class명이 다를수도");
    return;
  }

  // 구글 Apps Script로 POST 전송
  fetch(WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ data: itemProperties }), //
  })
    .then(() => {
      alert('[item] : ${itemProperties.length} \n ${new Date().toLocaleTimeString()}');
    })
    .catch((err) => {
      console.error(err);
      alert("전송 도중 에러가 발생했습니다.");
    });
})();
;`
    // 최신 클립보드 API를 이용하여 복사 수행
    navigator.clipboard.writeText(fullCode).then(() => {

      statusDiv.innerText = "코드가 클립보드에 복사되었습니다! 알리 콘솔창에 붙여넣으세요.";
      statusDiv.style.display = "block";

      // 3초 뒤 성공 메시지 숨김
      setTimeout(() => {
        statusDiv.style.display = "none";
      }, 3000);
    }).catch(err => {
      console.error('복사 실패:', err);
      alert('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
    });
  }
