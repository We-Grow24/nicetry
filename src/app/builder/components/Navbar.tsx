"use client";
/**
 * Navbar — converted from wixclone/src/Component/Navbar/navbar.js
 * Changes made for Next.js compatibility:
 *   - react-router-dom (useNavigate, useMatch, Link) → next/navigation + next/link
 *   - Custom useUser hook → window.__grapes editor reference
 *   - CSS modules kept as inline Tailwind classes
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useRef } from "react";
import { pageDesignContext } from "./context";

export default function BuilderNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const parentDropDownSlide = useRef<HTMLUListElement>(null);
  const dropdownSlide = useRef<HTMLDivElement>(null);
  const selectPageList = useRef<HTMLDivElement>(null);

  const pageDesignState = useContext(pageDesignContext);

  const isPageDesign = pathname.startsWith("/builder");

  useEffect(() => {
    // Re-render when webDesignState changes (same as original useEffect)
  }, [pageDesignState.webDesignState]);

  const currentActiveMenu = (e: React.MouseEvent<HTMLLIElement>) => {
    const target = e.target as HTMLElement;
    const li = target.closest("li");
    if (!li || !parentDropDownSlide.current || !dropdownSlide.current) return;

    const elpos = Number(li.getAttribute("data-elementid"));
    const allListEl = parentDropDownSlide.current.querySelectorAll("li[data-elementid]");

    if (elpos - 2 > -1) {
      const prevUl = (allListEl[elpos - 2] as HTMLElement).querySelector("ul") as HTMLElement | null;
      if (prevUl) {
        prevUl.style.transform = `translateX(${(allListEl[elpos - 2] as HTMLElement).getBoundingClientRect().width}px)`;
        prevUl.style.scale = "0";
      }
    }

    if (elpos < allListEl.length) {
      const nextUl = (allListEl[elpos] as HTMLElement).querySelector("ul") as HTMLElement | null;
      if (nextUl) {
        nextUl.style.transform = `translateX(-${(allListEl[elpos] as HTMLElement).getBoundingClientRect().width}px)`;
        nextUl.style.scale = "0";
      }
    }

    const el = li.querySelector("ul") as HTMLElement | null;
    if (el) {
      el.style.transform = "translateX(0px) rotateY(0deg)";
      el.style.scale = "1";
    }

    const ht = li.getAttribute("data-dropheight");
    const parentRect = parentDropDownSlide.current.getBoundingClientRect();
    dropdownSlide.current.style.transform = `translateX(${
      target.getBoundingClientRect().x - parentRect.x - 10
    }px)`;
    dropdownSlide.current.style.height = (ht ?? "0") + "px";
  };

  const elementLeaveRemove = (e: React.MouseEvent<HTMLLIElement>) => {
    const el = (e.target as HTMLElement).closest("li")?.querySelector("ul") as HTMLElement | null;
    if (el) {
      el.style.transform = "translateX(0px) rotateY(0deg) scale(0)";
      el.style.scale = "0";
    }
  };

  const removeSliderBox = () => {
    if (!dropdownSlide.current) return;
    dropdownSlide.current.style.scale = "0";
    dropdownSlide.current.style.opacity = "0";
  };

  const showSliderBox = () => {
    if (!dropdownSlide.current) return;
    dropdownSlide.current.style.opacity = "1";
    dropdownSlide.current.style.scale = "1";
  };

  const createNewPage = () => {
    pageDesignState.setDesign({ ...pageDesignState.design, settigMode: 4 });
  };

  return (
    <nav className="flex items-center justify-between h-full px-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      {/* Logo / title (original: navbar_header_logo) */}
      <div className="text-base font-semibold text-gray-800 dark:text-white">
        WebPage Builder
      </div>

      {/* Page selector — shown only inside the builder (mirrors isPageDesign check) */}
      {isPageDesign &&
        pageDesignState.webDesignState.pages &&
        pageDesignState.webDesignState.pages.length > 0 && (
          <div className="relative" ref={selectPageList}>
            <span
              className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => selectPageList.current?.classList.toggle("show")}
            >
              {pageDesignState.webDesignState.pages.find(
                (p) => p.pageId === (pageDesignState as unknown as Record<string,unknown>).editorPageId as unknown as string
              )?.pageName ?? "Select page"}
            </span>
          </div>
        )}

      {/* Main nav menu */}
      <ul
        className="flex items-center gap-4"
        ref={parentDropDownSlide}
        onMouseLeave={removeSliderBox}
        onMouseEnter={showSliderBox}
      >
        {[
          { label: "Layouts", items: ["Add Section", "Add Row"] },
          { label: "Pages", items: ["New Page", "Manage Pages"] },
          { label: "Settings", items: ["Fonts", "Analytics", "Website Settings"] },
        ].map((menu, idx) => (
          <li
            key={idx}
            data-elementid={idx + 1}
            data-dropheight={menu.items.length * 40}
            className="relative cursor-pointer text-sm text-gray-600 dark:text-gray-300 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
            onClick={currentActiveMenu}
            onMouseLeave={elementLeaveRemove}
          >
            {menu.label}
            <ul className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[150px] scale-0 origin-top transition-all z-50">
              {menu.items.map((item, i) => (
                <li
                  key={i}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item === "New Page") createNewPage();
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {/* Hover indicator (original: dropdownSlide ref) */}
      <div
        ref={dropdownSlide}
        className="absolute top-14 pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow opacity-0 transition-all duration-150 z-40"
        style={{ height: 0, minWidth: 120 }}
      />

      {/* Right: save / preview actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Link
          href="/"
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>
    </nav>
  );
}
