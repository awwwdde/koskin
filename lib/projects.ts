export type Project = {
  slug: string;
  number: string;
  name: string;
  category: "Графика" | "Брендинг" | "Пространство";
  label: string;
  image: string;
  description: string;
  role: string;
  tasks: string[];
  tools: string[];
};

// Facts are taken from Roman's existing portfolio. Cover photographs are
// illustrations from that site, not verified photographs of his own work.
export const projects: Project[] = [
  {
    slug: "house-of-unions", number: "01", name: "Дом Союзов", category: "Графика",
    label: "Визуальные коммуникации", image: "/images/posters.jpg",
    description: "Афиши, логотипы, брендбуки и презентации. Работа с визуальными материалами Дома Союзов.",
    role: "Графический дизайн",
    tasks: ["Разработка афиш и визуальных материалов", "Работа с фирменной стилистикой", "Адаптация под разные форматы и аудитории", "Подготовка презентаций"],
    tools: ["Illustrator", "InDesign", "Photoshop"]
  },
  {
    slug: "trueman", number: "02", name: "TRUEMAN", category: "Брендинг",
    label: "Собственный бизнес · Подольск", image: "/images/barber.jpg",
    description: "Собственный барбершоп в Подольске. Развитие бизнеса, работа с оформлением и клиентским обслуживанием.",
    role: "Основатель · работа с образом бизнеса",
    tasks: ["Развитие собственного барбершопа", "Работа с восприятием бренда", "Внимание к клиентскому опыту", "Связь визуальных решений и бизнеса"],
    tools: ["Бренд", "Пространство", "Клиентский опыт"]
  },
  {
    slug: "spatial-design", number: "03", name: "Интерьеры", category: "Пространство",
    label: "Интерьеры и пространственные решения", image: "/images/interior.jpg",
    description: "Планировки, зонирование, подбор материалов и визуализация. Опыт работы с интерьерными решениями в коммерческих студиях.",
    role: "Дизайн интерьеров · пространственные решения",
    tasks: ["Проработка планировочных решений", "Зонирование пространства", "Работа с материалами", "Визуальная подача концепции"],
    tools: ["AutoCAD", "Revit", "Photoshop"]
  },
  {
    slug: "architecture", number: "04", name: "Архитектура", category: "Пространство",
    label: "Архитектура и проектирование", image: "/images/architecture.jpg",
    description: "Генпланы, фасады и разрезы в AutoCAD и Revit. Проектная деятельность в ООО «Сокет телеком» и ООО «Интеграл».",
    role: "Проектирование · черчение",
    tasks: ["Подготовка чертежей", "Работа с генеральными планами", "Проработка фасадов", "Подготовка разрезов"],
    tools: ["AutoCAD", "Revit"]
  }
];

export const imageDisclosure = "Обложка — иллюстрация направления с прежнего сайта. Авторские материалы предоставляются по запросу.";
