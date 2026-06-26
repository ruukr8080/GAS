/**
 * AliExpress Order List API Interceptor
 * 사용법: 브라우저 콘솔에 전체 코드 붙여넣기 후 실행
 * 알리익스프레스 주문 목록 페이지에서 실행하세요.
 *
 * 전송 대상 컬럼:
 * A(packageNum) B(account) C(title) D(sku) E(empty)
 * F(quantity)   G(price)   H(requestResult) I(request)
 * J(productId)  K(orderId) L(store) M(imageUrl) N(log)
 */

(function () {
  // ──────────────────────────────────────────
  // ★ 여기에 GAS Web App URL을 입력하세요
  // ──────────────────────────────────────────
  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbzRYKv87HmAW2vGaUiyYswR4IZYv8kU6NtwgMu90a9GlW0v88hGr3kv4dCfdVzaJRg_/exec";
  const ACCOUNT = ""; // B열: 수동 입력 또는 빈칸

  // ── 유틸 ──────────────────────────────────

  /** HTML 태그 제거 */
  function stripHtml(html) {
    if (!html) return "";
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * detailList[n].title → { request(I), requestResult(H) } 파싱
   * title 예시:
   *   "고급 환불 완료 </medium><span ...>₩4,791</span></medium>"
   *   "전액 환불 처리됨 </medium><span ...>₩4,684</span></medium>, 반품할 필요 없음"
   *
   * 구분자: span 앞까지 = request(I), span 내용 = requestResult(H)
   */
  function parseTitle(rawTitle) {
    if (!rawTitle) return { request: "", requestResult: "" };

    // span 색상 금액 추출
    const spanMatch = rawTitle.match(/<span[^>]*>(.*?)<\/span>/i);
    const requestResult = spanMatch ? stripHtml(spanMatch[1]) : "";

    // span 이전 텍스트 = 요청 유형
    const beforeSpan = rawTitle.split(/<span/i)[0];
    const request = stripHtml(beforeSpan);

    return { request, requestResult };
  }

  /**
   * skuAttrs 배열 → "Name: text / Name: text" 형태 문자열
   * Ships From 제외
   */
  function formatSku(skuAttrs) {
    if (!Array.isArray(skuAttrs) || skuAttrs.length === 0) return "";
    return skuAttrs
      .filter((s) => s.name !== "Ships From")
      .map((s) => `${s.name}: ${s.text}`)
      .join(" / ");
  }

  /**
   * 이미지 URL로 detailList 항목 찾기
   * detailList[n].iconList[0] ↔ orderLine.itemImgUrl 매칭
   */
  function findDetailByImage(detailList, itemImgUrl) {
    if (!Array.isArray(detailList) || !itemImgUrl) return null;
    // URL 비교 시 _220x220 suffix 전까지만 비교 (리사이즈 파라미터 무시)
    const baseUrl = itemImgUrl.split("_220x220")[0];
    return (
      detailList.find((d) => {
        const icons = d.iconList || [];
        return icons.some((icon) => icon.split("_220x220")[0] === baseUrl);
      }) || null
    );
  }

  // ── 주문 데이터 파싱 ──────────────────────

  function parseOrderData(responseJson) {
    const rows = [];
    const data = responseJson?.data?.data;
    if (!data) return rows;

    Object.values(data).forEach((component) => {
      if (component.type !== "pc_om_list_order") return;

      const fields = component.fields;
      const orderId = fields.orderId || component.id;
      const packageNum = fields.orderDateText || ""; // A
      const store = fields.storeName || ""; // L
      const totalPriceRaw = fields.formatPriceInfo || "";

      // exposeInfo.itemList[0].detailList (환불/반품 정보)
      const detailList = fields.exposeInfo?.itemList?.[0]?.detailList || [];

      const orderLines = fields.orderLines || [];

      orderLines.forEach((line) => {
        // 이미지 URL로 detailList 매칭
        const matchedDetail = findDetailByImage(detailList, line.itemImgUrl);
        const { request, requestResult } = parseTitle(
          matchedDetail?.title || "",
        );

        // G(price): 개별 상품 금액 (formatPriceInfo 두 번째 파이프 값)
        const priceParts = (line.formatPriceInfo || "").split("|");
        const price = priceParts[1] || priceParts[0] || "";

        const row = {
          A: packageNum, // packageNum (주문일자)
          B: ACCOUNT, // account (수동)
          C: line.itemTitle || "", // title
          D: formatSku(line.skuAttrs), // sku
          E: "", // empty
          F: String(line.quantity ?? ""), // quantity
          G: price, // price (숫자만)
          H: requestResult, // requestResult
          I: request, // request
          J: line.productId || "", // productId
          K: String(orderId), // orderId
          L: store, // store
          M: line.itemImgUrl || "", // imageUrl
          N: new Date().toISOString(), // log (타임스탬프)
        };

        rows.push(row);
      });
    });

    return rows;
  }

  // ── GAS 전송 ──────────────────────────────

  async function sendToGAS(rows) {
    if (!rows.length) {
      console.log("[Interceptor] 전송할 데이터 없음");
      return;
    }
    console.log(`[Interceptor] GAS로 ${rows.length}행 전송 중...`);
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors", // GAS는 CORS 헤더 미지원 → no-cors
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      // no-cors 모드에서는 응답 본문 읽기 불가 (opaque response)
      console.log("[Interceptor] 전송 완료 (GAS 응답은 no-cors로 확인 불가)");
    } catch (e) {
      console.error("[Interceptor] 전송 실패:", e);
    }
  }

  // ── XHR / fetch 인터셉터 ──────────────────

  const TARGET_API = "mtop.aliexpress.trade.buyer.order.list";

  /** fetch 인터셉터 */
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    const response = await originalFetch.apply(this, args);

    if (url.includes(TARGET_API)) {
      response
        .clone()
        .json()
        .then((json) => {
          console.log("[Interceptor] fetch 응답 감지:", url);
          const rows = parseOrderData(json);
          sendToGAS(rows);
        })
        .catch(() => {
          // JSONP 형식이면 json() 파싱 실패 → XHR 인터셉터에서 처리
        });
    }

    return response;
  };

  /** XHR 인터셉터 (JSONP 콜백 방식 대응) */
  const OriginalXHR = window.XMLHttpRequest;
  function InterceptedXHR() {
    const xhr = new OriginalXHR();
    const open = xhr.open.bind(xhr);
    let targetUrl = "";

    xhr.open = function (method, url, ...rest) {
      targetUrl = url;
      return open(method, url, ...rest);
    };

    xhr.addEventListener("load", function () {
      if (!targetUrl.includes(TARGET_API)) return;
      console.log("[Interceptor] XHR 응답 감지:", targetUrl);

      let text = xhr.responseText || "";
      // JSONP 래퍼 제거: mtopjsonpXXX({...}) → {...}
      const jsonpMatch = text.match(/^[^(]+\((.+)\)\s*;?\s*$/s);
      if (jsonpMatch) text = jsonpMatch[1];

      try {
        const json = JSON.parse(text);
        const rows = parseOrderData(json);
        sendToGAS(rows);
      } catch (e) {
        console.error("[Interceptor] JSON 파싱 실패:", e);
      }
    });

    return xhr;
  }
  InterceptedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = InterceptedXHR;

  /** JSONP 콜백 직접 인터셉트 (mtopjsonp* 함수) */
  const callbackPattern = /^mtopjsonp/;
  const proxyHandler = {
    set(target, prop, value) {
      if (callbackPattern.test(prop) && typeof value === "function") {
        const original = value;
        target[prop] = function (data) {
          console.log("[Interceptor] JSONP 콜백 감지:", prop);
          const rows = parseOrderData(data);
          sendToGAS(rows);
          return original.call(this, data);
        };
      } else {
        target[prop] = value;
      }
      return true;
    },
  };

  try {
    window = new Proxy(window, proxyHandler); // 일부 브라우저에서 제한될 수 있음
  } catch (e) {
    // window Proxy 불가 시 무시 (XHR 인터셉터로 커버)
  }

  console.log(
    `[Interceptor] 활성화됨 ✅\n타겟: ${TARGET_API}\nGAS URL: ${GAS_URL}`,
  );
})();
