// Видимость холста — общее состояние для страницы (IndexPage) и шапки
// (MainLayout): в шапке по этому флагу скрываются элементы управления холстом.
import { ref } from "vue";

export const canvasHidden = ref(false);
