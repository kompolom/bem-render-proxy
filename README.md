bem-render-proxy
==================

Позволяет связать проект на bemtree - bemhtml c бекендом на любом языке программирования.

Минимальный рабочий пример для классического стека (BEMXJST):

```javascript
const { BemRenderProxy, ClassicRenderer, ClassicBackend, conf } = require('bem-render-proxy'),
 brp = new BemRenderProxy({
     config: conf,
     backends: [new ClassicBackend({ host: 'localhost', port: 8080, name: 'classic' })]
 }), // Создаем экземпляр прокси
    rendererConfig = { // Опции для шаблонизатора
        bundleFormat : conf.BUNDLE_FORMAT,
        pageFormat : conf.PAGE_FORMAT
    };

// Добавляем шаблонизатор по умолчанию
brp.addEngine('classic', new ClassicRenderer(rendererConfig), true);
// Запускаем прокси на порту по-умолчанию
brp.start();
```

## Бекенды

Возможно зарегистрировать несколько бекендов и в зависимости от различных условий направлять запрос в указанный бекенд. Функция выбора бекенда может быть передана в конструктор BRP. Иначе, используется первый бекенд в списке.

Использование нескольких бекендов:
```javascript
import { BemRenderProxy, Backend } from "bem-render-proxy";

new BemRenderProxy({
    backends: [
        new Backend({ host: '8.8.8.8', port: 8080, name: 'backend1' }),
        new Backend({ host: '4.4.4.4', port: 3000, name: 'backend2' })
    ],
    backendSelectFunc: (request, backends) => {
        return backends['backend2'];
    }
})
```

## Шаблонизаторы

Один экземпляр BemRenderProxy позволяет использовать несколько шаблонизаторов. Что позволяет использовать как классический так и React стек одновременно.
В пакет входят 2 шаблонизатора:

- `ClassicRenderer` - для классического стека
- `JsonRenderer` - для задач отладки

### ClassicRenderer

Рендерит BEMTREE + BEMHTML. Данный шаблонизатор может изменять свой вывод в зависимости от переданных в конструктор опций и параметров url.

#### Параметры url

 Во режиме разработки следующие параметры можно передать в GET запросе.

 * `json` - Отдать переданный бэкендом json без преобразований
 * `bemjson` - Применить только BEMTREE шаблоны и отдать полученный bemjson

Пример:
Следующий запрос вернет результат выполнения BEMTREE шаблонов

```
    GET myproject.dev/cart?rebuild=1&bemjson=1
```

## Патчи данных

Патчи служат для модификации данных от сервера, чтобы не ждать обновления API на стороне backend. Работают только в режиме разработки посредством url параметра `patch`. Патчи должны лежать в директории `data/patch`

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

```javascript
// Данные от backend
{
    a: 10,
    b: 20,
};
```

```js
// Данные после патча
{
    a: 10,
    b: 20,
    feature: { test: 'data' }
}
```

#### Работа с несколькими патчами

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
    "my-scripts/long/link/index.min.js": "./freezed/_/dsdgjlka342jfsgjslkgjs41jgls1k8gjslkgs.js"
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
