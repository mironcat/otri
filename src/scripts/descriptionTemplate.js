// Глобальный шаблон markdown-описания.
//
// Пользователь может отредактировать описание и сохранить его как шаблон.
// Шаблон хранится вне проекта (localStorage), поэтому применяется к новым
// описаниям во всех будущих проектах. Уже созданные/отредактированные
// описания текущего проекта он не трогает — они хранят свой markdown.
const TEMPLATE_STORAGE_KEY = "otri.descriptionTemplate";

export function getDescriptionTemplate() {
  try {
    return window.localStorage.getItem(TEMPLATE_STORAGE_KEY) || null;
  } catch {
    // localStorage может быть недоступен — шаблона нет
    return null;
  }
}

export function setDescriptionTemplate(markdown) {
  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, markdown);
    return true;
  } catch {
    return false;
  }
}

export function clearDescriptionTemplate() {
  try {
    window.localStorage.removeItem(TEMPLATE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
