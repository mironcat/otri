# Otri — [O]stracods and [tri]angles

**Otri** — настольное приложение (Vue 3 + Quasar + Electron) для измерения ископаемых
остракод на микрофотографиях **методом треугольников**: размеры и угловые параметры
раковины вычисляются из «треугольников», размечаемых пользователем прямо на снимке.

Fossil ostracod measuring using the method of right triangles (Naumcheva, 2019).

## Возможности

- Загрузка изображения раковины; зум, поворот, перетаскивание, фиксация изображения.
- **Канвас на всю ширину** — SVG автоматически подстраивается под размер окна (высота 600px).
- **Направляющие (Guides)** — перетаскиваемые вертикальные/горизонтальные линии для ориентации; показываются/скрываются парой кнопок в шапке.
- **Лупа (Magnifier)** — удержание на точке увеличивает область вокруг неё; также включается клавишей **Z**.
- **Калибровка по масштабной линейке** (задание длины шкалы в единицах измерения).
- Режим измерения **латеральной стороны**:
  - правая или левая створка;
  - обычный либо **вогнутый брюшной край** (concave ventral margin);
  - размеры длины (`L`) и высоты (`H`);
  - треугольники **AD, PD, AV, PV** (угол `alfa` и отрезки `l`, `h`, `n`, `s`);
  - замеры брюшного края **V** (`lv`, `lvl`, `dv`).
- Режим измерения **дорсальной стороны**:
  - ширина (`W`), полная раковина или половина (fullness);
  - треугольники **AR, PR, AL, PL** (угол `alfa` и отрезки `l`, `h`, `n`, `s`).
- **Замок следования (Lock)** — иконка в центре рамки: когда замок закрыт, перемещение и поворот изображения синхронно двигают точки и рамку.
- **Сброс поворота** — при повороте рамки рядом с замком появляется иконка **↻**; клик возвращает рамку в горизонталь и размыкает замок. Двойной клик по рамке делает то же самое.
- **Подпись измерений** — текстовое поле над замком отображает `label` замера; если шкала не откалибрована — показывается `"not scaled"`.
- **Регуляторы размера** (Tune) — кнопка в шапке открывает попап с полями для множителя радиуса точек и толщины линий. Меняется только внешний вид, положение элементов не сдвигается.
- Таблицы замеров (латеральные и дорсальные) с удалением записей.
- Экспорт результатов в **CSV** — раздельно по таблицам или сводная объединённая таблица по номерам записей (`Export to csv`).

## Стек

- [Vue 3](https://vuejs.org/) + [Quasar v2](https://quasar.dev/) (Quasar CLI Vite)
- [SVG.js](https://svgjs.dev/) + svg.draggable.js — интерактивная разметка на SVG-канвасе
- [Electron](https://www.electronjs.org/) — десктопная сборка (Windows)

## Требования

- Node.js ≥ 18
- pnpm (или npm ≥ 6.13.4 / yarn ≥ 1.21.1; в репозитории есть lock-файлы pnpm)

## Установка зависимостей

```bash
pnpm install
# или
yarn
```

## Запуск в режиме разработки

Горячая перезагрузка кода, отчёты об ошибках и т.д.:

```bash
pnpm run dev
# или
quasar dev
```

## Сборка

Сборка веб-версии:

```bash
pnpm run build
```

Сборка Electron-приложения (по умолчанию под текущую платформу):

```bash
pnpm run build:electron
```

Целевые платформы можно задать вручную, например:

```bash
pnpm run build:electron:win64   # Windows x64
pnpm run build:electron:win32   # Windows ia32
pnpm run build:electron:debug   # с отладкой
pnpm run build:electron:ui      # с интерфейсом сборщика
```

Упаковка портативной версии для Windows (zip из `dist/electron/Packaged/win-unpacked`):

```bash
pnpm run package:win
# полная очистка + сборка + упаковка:
pnpm run release:win
```

## Линт и форматирование

```bash
pnpm run lint      # ESLint (.js, .vue)
pnpm run format    # Prettier
```

## Структура проекта

```
src/
  pages/IndexPage.vue        # основной экран: канвас, таблицы, экспорт CSV
  layouts/MainLayout.vue     # шапка: меню, направляющие, лупа, tune, версия
  components/                # таблицы результатов замеров
  scripts/
    leftsideobjects.js       # объекты разметки латеральной стороны
    concaveobjects.js        # вариант с вогнутым брюшным краем
    dorsalobjects.js         # объекты разметки дорсальной стороны
    utils.js                 # общие утилиты (lock toggle, пересечения линий, углы)
    geostyle.js              # множители размера точек и линий
    guides.js                # направляющие линии + resizeGuides
    magnifier.js             # лупа для точек
    scalebar.js              # масштабная линейка и калибровка
    triangles.js, mo.js
  boot/
    svgjs.js                 # инициализация SVG.js и EventBus (provide)
src-electron/                # main-процесс Electron: electron-main.js, preload, иконки
quasar.config.js             # конфигурация Quasar CLI
```

## Настройка конфигурации

Подробнее о параметрах сборки: [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## References

Naumcheva, M.A. A New Method for Description of Smooth Ostracod Shells, Using Permian and Triassic Ostracods from Eastern Europe // Paleontological Journal. 2019. Vol. 53. № 6. P. 616–628.
