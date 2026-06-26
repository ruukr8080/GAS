/**
 * AliExpress Order Interceptor - Google Apps Script
 *
 * 설정 방법:
 * 1. Google Sheets 열기 → 확장 프로그램 → Apps Script
 * 2. 이 코드 전체 붙여넣기
 * 3. SHEET_NAME 상수를 원하는 시트 이름으로 변경
 * 4. 배포 → 새 배포 → 유형: 웹 앱
 *    - 다음 사용자로 실행: 나
 *    - 액세스 권한: 모든 사용자 (익명 포함)
 * 5. 배포 URL을 복사하여 interceptor.js의 GAS_URL에 붙여넣기
 *
 * 컬럼 순서:
 * A(packageNum) B(account) C(title)   D(sku)  E(=ARRAYFORMULA(IF(ISBLANK(M2:M), "", IMAGE(M2:M))))
 * F(quantity)   G(price)   H(requestResult) I(request)
 * J(productId)  K(orderId) L(store)   M(imageUrl) N(log)
 */

const SHEET_NAME = "orders"; // ← 원하는 시트 이름으로 변경
const COL_ORDER = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
];

// ── 헤더 정의 ──────────────────────────────
const HEADERS = {
  A: "packageNum",
  B: "account",
  C: "title",
  D: "sku",
  E: '=ARRAYFORMULA(IF(ISBLANK(M1:M), "", IMAGE(M1:M)))',
  F: "quantity",
  G: "price",
  H: "requestResult",
  I: "request",
  J: "productId",
  K: "orderId",
  L: "store",
  M: "imageUrl",
  N: "log",
};

// ── 시트 초기화 ────────────────────────────
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // 헤더 행 삽입
    const headerRow = COL_ORDER.map((col) => HEADERS[col]);
    sheet.appendRow(headerRow);

    // 헤더 스타일
    const headerRange = sheet.getRange(1, 1, 1, COL_ORDER.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4A90D9");
    headerRange.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);

    // 컬럼 너비 조정
    sheet.setColumnWidth(3, 300); // C: title
    sheet.setColumnWidth(4, 150); // D: sku
    sheet.setColumnWidth(8, 150); // H: requestResult
    sheet.setColumnWidth(9, 120); // I: request
    sheet.setColumnWidth(13, 200); // M: imageUrl
  }

  return sheet;
}

// ── Map으로 중복 체크 (orderId + productId 기준) ──
function buildExistingMap(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return new Map();
  }

  // J~K만 읽음
  const values = sheet.getRange(2, 10, lastRow - 1, 2).getValues();
  const map = new Map();

  values.forEach((r, i) => {
    map.set(String(r[1]) + "|" + String(r[0]), i + 2);
  });

  return map;
}

// ── POST 핸들러 ────────────────────────────
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const payload = JSON.parse(e.postData.contents);
    const rows = payload.rows || [];

    if (!rows.length) {
      return jsonResponse({
        status: "ok",
        insertCount: 0,
        updateCount: 0,
      });
    }

    const sheet = getOrCreateSheet();
    const existingMap = buildExistingMap(sheet);

    const inserts = [];
    const updates = [];

    let insertCount = 0;
    let updateCount = 0;

    rows.forEach((row) => {
      const key = String(row.K) + "|" + String(row.J);

      if (existingMap.has(key)) {
        updates.push({
          rowIndex: existingMap.get(key),
          values: [row.G, row.H, row.I, row.J, row.K, row.L, row.M, row.N],
        });

        updateCount++;
      } else {
        inserts.push(COL_ORDER.map((col) => row[col] ?? ""));
        insertCount++;
      }
    });

    // 기존 행 업데이트
    updates.forEach((item) => {
      sheet.getRange(item.rowIndex, 7, 1, 8).setValues([item.values]);
    });

    // 신규 행 추가
    if (inserts.length) {
      const startRow = sheet.getLastRow() + 1;

      sheet
        .getRange(startRow, 1, inserts.length, COL_ORDER.length)
        .setValues(inserts);
    }

    return jsonResponse({
      status: "ok",
      insertCount,
      updateCount,
    });
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.message,
    });
  } finally {
    lock.releaseLock();
  }
}

// ── GET 핸들러 (연결 테스트용) ─────────────
function doGet(e) {
  return jsonResponse({
    status: "ok",
    message: "AliExpress Interceptor GAS 정상 작동 중",
  });
}

// ── 헬퍼 ──────────────────────────────────
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
