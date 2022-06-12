const tabsNavigation = document.querySelectorAll(".tabs__default-radio");
const activeNavigationTab = document.querySelector(
  ".tabs__default-radio:checked"
);
const tabs = document.querySelectorAll(".tabs__tab-content");
const tabNavigationList = document.querySelector(".tabs__list");

const activeTab = [...tabs].find(
  (item) => item.dataset.tabname === activeNavigationTab.value
);

if (activeTab) activeTab.classList.add("active");

const handleTabChange = (e) => {
  const { value } = e.target;

  const prevActiveTab = document.querySelector(".tabs__tab-content.active");

  prevActiveTab.classList.remove("active");

  const activeTab = [...tabs].find((item) => item.dataset.tabname === value);

  activeTab.classList.add("active");
};

[...tabsNavigation].forEach((item) =>
  item.addEventListener("change", handleTabChange)
);
