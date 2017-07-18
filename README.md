bem-render-proxy
==================

Позволяет связать проект на bemtree - bemhtml c бекендом на любом языке программирования.

Можно получить разный результат в зависимости от переменных окружения и переданных параметров.

## Параметры запроса
 Во режиме разработки следующие параметры можно передать в GET запросе.

 * `json` - Отдать переданный бэкендом json без преобразований
 * `bemjson` - Применить BEMTREE шаблоны, но не применять bemhtml
 * `rebuild` - Пересобрать бандл перед подключением шаблонов
 * `patch` - Применить патчи (из директории data/patch) к данным

Пример:
Следующий запрос пересоберет страницу /cart и вернет результат BEMTREE

```
    GET myproject.dev/cart?rebuild=1&bemjson=1
```

## Патчи данных

Патчи служат для модификации данных от сервера, чтобы не ждать обновления API на стороне backend.

### Формат патча
```js
// data/patch/my-path.js
module.exports = (data) => {
    data.feature = { test: 'data' }
}
```

### Использование
```
GET myproject.dev/?patch=my-path
```

```js
// Данные от backend
{
    a: 10,
    b: 20
}
```

```js
// Данные после патча
{
    a: 10,
    b: 20,
    feature: { test: 'data' }
}
```

#### Работа с нескольки патчами

```
GET myproject.dev/?patch=feature1;feature2
```

Данные от сервера пройдут обработку последовательно через

```
1: data/patch/feature1.js
2: data/patch/feature2.js
```

## Заморозка статики

Прокси умеет отдавать правильные ссылки на замороженые ресурсы используя json карту соответсвия.
Для указания файла с картой используется переменная окружения `FREEZE_MAP` с указанием пути до карты относительно корня проекта.
переменная окружения `NORMALIZE_FREEZE_URLS` позволяет использовать карту с windows путями, однако добавляет оверхед.
Не рекомендуется использовать эту опцию в production окружении

### Генерация карты кода

Для генерации карты можно использовать `borschik`:

```bash
$ borschik freeze --input=js > freeze-info.json
```

Подробнее в документации к [borschik](https://github.com/bem-site/bem-method/blob/bem-info-data/articles/borschik/borschik.ru.md#Полная-заморозка)

### Использование в шаблонах

В BEMTREE становится доступна функция `getFreezed()`

Пример:

```javascript
// FREEZEMAP
{
    "my-scripts/long/link/index.min.js" : "./freezed/_/dsdgjlka342jfsgjslkgjs41jgls1k8gjslkgs.js"
}

// BEMTREE
block('page')(
    content()((node, ctx) => [{
        scripts: [{ elem: 'js', url: node.getFreezed('my-scripts/long/link/index.min.js') }],
    }])
)

// BEMJSON
{
    block : 'page'
    scripts: [{ elem: 'js', url: './freezed/_/dsdgjlka342jfsgjslkgjs41jgls1k8gjslkgs.js' }]
}
```

## Схемы именования бандлов

Поддерживается произвольная схема именования бандлов.
Чтобы задать схему бандлов можно использовать переменные окружения `BUNDLE_FORMAT`, и `PAGE_FORMAT` чтобы сконфигурировать
формат бандла и страницы соответственно.

Значения по умолчанию:

```
BUNDLE_FORMAT='{platform}.pages'
PAGE_FORMAT='page_{scope}_{view}'
```

Где
 - `{platform}` платформа запрашиваемой страницы. По умолчанию desktop
 - `{scope}` раздел сайта. Например public, admin, error
 - `{view}` имя страницы. По умолчанию index


## Отправка ошибок по email
Смотри пример настроек в .env.example (LOGMAIL)
