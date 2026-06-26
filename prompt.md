추출해야할 데이터 중에 account는 <div id="_global_header_23_"> 내부에 있어.

그리고 추출해야될 items는 전부 <div class="comet-checkbox-group"> 내부에 있다.
그 내부에는 <div class="order-item">마다 각 제품들의 데이터가 들어가 있다.

각 제품들은 아래의 구성으로 이뤄져있다. (공통부분)

- order-item-header
- order-item-store
- order-item-content
  - order-item-content-body
    - order-item-content-info
      - order-item-content-info-name
      - order-item-content-info-sku
      - order-item-content-info-number
        - es--wrap--1Hlfkoj notranslate
        - order-item-content-info-number-quantity
  - order-item-content-opt
    - order-item-content-opt-price
    - order-item-content-opt-quantity
- order-item-bottom-action
  - expose-info
    - expose-info-item-title

위 구성에서 필요한 데이터는 아래와 같다.

- order-item-header
  1. 주문 일자
  2. 주문 번호

- order-item-store
  1. choice여부
  2. 판매자명
- order-item-content
  - order-item-content-body
    - order-item-content-info
      - order-item-content-info-name
        1. 상품명
      - order-item-content-info-sku
        1. 상세옵션
      - order-item-content-info-number
        - es--wrap--1Hlfkoj notranslate
        1. 상품기본가격
        - order-item-content-info-number-quantity
        1. 상품 갯수
  - order-item-content-opt
    - order-item-content-opt-price
      - es--wrap--1Hlfkoj notranslate
        1. 최종 가격

- order-item-bottom-action
  - expose-info
    - expose-info-item-title { 1. "AliExpress의 피드백을 기다리는 중입니다." (이경우 상품 상태 = 대기) 2. "환불 완료" (이경우 상품 상태 = "환불 완료"+span.innertText "환불금액") 3. "고급 환불 완료 " (이경우 상품 상태 = "고급 환불 완료"+span.innertText "환불금액") 4. "요청 완료 " (이경우 상품 상태 = "요청 완료"+span.innertText "환불금액")
      }

### 'Choice상품' 여부와 판매자

    - Choice상품이 맞다면 = <img class="order-item-store-icon" src="https://ae-pic-a1.aliexpress-media.com/kf/Se5bee6b872c34652909ace14ca3d6ab50/272x80.png">
    - Choice상품이 아니라면 <img class="order-item-store-icon">가 없음.

- 판매자명 seller = <span class="order-item-store-name " data-pl="order_item_store_name"><a href="//www.aliexpress.com/store/1102997912" target="_blank"><span> '판매자명'</span></a></span>

<div class="order-item-store"><img class="order-item-store-icon" src="https://ae-pic-a1.aliexpress-media.com/kf/Se5bee6b872c34652909ace14ca3d6ab50/272x80.png" alt=""><span class="order-item-store-name " data-pl="order_item_store_name"><span>Halojaju Official Store</span></span></div>

# 'item properties'

### 'order-item-content-body'

###

{ 이미지 주소, 상품명, 가격, 수량,
}

data.pc_om_list_order_`oderId`
{
    "fields": {
        "exposeInfo": {
            "itemList": [
                {"detailList": [
                  {
                    "title": "`request`+`requestResult`",
                  }
                ],
              }
            ],
        "orderDateText": "`packageNum`",
        "orderLineSize": 1,
        "orderLines": [
          {            
                "formatPriceInfo": "₩11,110|11110|",
                "itemImgUrl": "`imageUrl`",
                "itemPriceText": "₩`itemesPrice`",
                "itemTitle": "`title`",
                "productId": "`productId`",
                "quantity": `quantity`,
                "skuAttrs`sku`": [
                    {   "id": 200007763,
                        "name": "Ships From",
                        "text": "CHINA",
                        "vid": 201336100
                    },
                    {
                        "id": 14,
                        "name": "Color",
                        "text": "S",
                        "vid": 10
                    }
                ]
            }
        ],
        "totalPriceText": "`itemPrice`",
    },
    "id": "1102190703111384",
    "position": "body",
    "scriptKey": "Pc_om_list_order_110655",
    "status": "normal",
    "strategy": "append",
    "tag": "pc_om_list_order",
    "type": "pc_om_list_order"
    }
}




