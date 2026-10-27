# Otri — [O]stracods and [tri]angles

**Otri** — настольное приложение (Vue 3 + Quasar + Electron) для измерения ископаемых
остракод на микрофотографиях **методом треугольников**: размеры и угловые параметры
раковины вычисляются из «треугольников», размечаемых пользователем прямо на снимке.

## Возможности

- Загрузка изображения раковины; зум, поворот, перетаскивание, фиксация изображения.
- Калибровка по **масштабной линейке** (задание длины шкалы в единицах измерения).
- Режим измерения **латеральной стороны**:
  - правая или левая створка;
  - обычный либо **вогнутый брюшной край** (concave ventral margin);
  - размеры длины (`L`) и высоты (`H`);
  - треугольники **AD, PD, AV, PV** (угол `alfa` и отрезки `l`, `h`, `n`, `s`);
  - замеры брюшного края **V** (`lv`, `lvl`, `dv`).
- Режим измерения **дорсальной стороны**:
  - ширина (`W`), полная раковина или половина (fullness);
  - треугольники **AR, PR, AL, PL** (угол `alfa` и отрезки `l`, `h`, `n`, `s`).
- Таблицы замеров (латеральные и дорсальные) с удалением записей.
- Экспорт результатов в **CSV** — раздельно по таблицам или сводная
  объединённая таблица по номерам записей (`Export to csv`).

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
  components/                # таблицы результатов замеров
  scripts/
    leftsideobjects.js       # объекты разметки латеральной стороны
    concaveobjects.js        # вариант с вогнутым брюшным краем
    dorsalobjects.js         # объекты разметки дорсальной стороны
    scalebar.js              # масштабная линейка и калибровка
    triangles.js, mo.js, utils.js
src-electron/                # main-процесс Electron: electron-main.js, preload, иконки
quasar.config.js             # конфигурация Quasar CLI
```

## Настройка конфигурации

Подробнее о параметрах сборки: [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
