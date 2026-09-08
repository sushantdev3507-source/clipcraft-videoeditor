import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import AppShell from "@/components/shell/AppShell";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — ClipCraft" },
      {
        name: "description",
        content:
          "Start from a ready-made ClipCraft template for reels, promos, tutorials and more.",
      },
      { property: "og:title", content: "Templates — ClipCraft" },
      {
        property: "og:description",
        content:
          "Start from a ready-made ClipCraft template for reels, promos, tutorials and more.",
      },
    ],
  }),
  component: TemplatesPage,
});

type Category = "social" | "marketing" | "education";

type Template = {
  id: string;
  title: string;
  description: string;
  ratio: string;
  category: Category;
  icon: string;
};

const templates: Template[] = [
  {
    id: "t1",
    title: "Vertical Reel",
    description: "Fast cuts and bold captions for short-form video.",
    ratio: "9:16",
    category: "social",
    icon: "▮",
  },
  {
    id: "t2",
    title: "Story Teaser",
    description: "A 15 second teaser with a title card and outro.",
    ratio: "9:16",
    category: "social",
    icon: "✦",
  },
  {
    id: "t3",
    title: "Product Promo",
    description: "Feature highlights with lower thirds and a call to action.",
    ratio: "16:9",
    category: "marketing",
    icon: "◈",
  },
  {
    id: "t4",
    title: "Brand Intro",
    description: "Logo reveal followed by a short product montage.",
    ratio: "16:9",
    category: "marketing",
    icon: "◆",
  },
  {
    id: "t5",
    title: "Tutorial Chapter",
    description: "Screen recording layout with step titles and captions.",
    ratio: "16:9",
    category: "education",
    icon: "▤",
  },
  {
    id: "t6",
    title: "Course Lesson",
    description: "Talking head with slide overlay and chapter markers.",
    ratio: "16:9",
    category: "education",
    icon: "▥",
  },
];

const categories: { label: string; value: Category | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Social", value: "social" },
  { label: "Marketing", value: "marketing" },
  { label: "Education", value: "education" },
];

function TemplatesPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return templates.filter(
      (template) =>
        (category === "all" || template.category === category) &&
        (template.title.toLowerCase().includes(term) ||
          template.description.toLowerCase().includes(term)),
    );
  }, [category, search]);

  return (
    <AppShell>
      <section className="media-library-header">
        <div>
          <span className="section-eyebrow">WORKSPACE</span>
          <h1>Templates</h1>
          <p>Start from a layout that already matches the video you need.</p>
        </div>

        <button
          type="button"
          className="primary-action-button"
          onClick={() => navigate({ to: "/entry" })}
        >
          + Start from scratch
        </button>
      </section>

      <div className="media-library-toolbar">
        <input
          type="search"
          className="media-search"
          placeholder="Search templates..."
          aria-label="Search templates"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="media-filters">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`media-filter${category === item.value ? " active" : ""}`}
              aria-pressed={category === item.value}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="media-empty-state">
          <div className="media-empty-icon">◇</div>
          <h3>No templates match that search</h3>
          <p>Try another keyword, or begin with an empty project.</p>
          <button
            type="button"
            className="secondary-editor-button"
            onClick={() => navigate({ to: "/entry" })}
          >
            Start from scratch
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {visible.map((template) => (
            <article className="project-card" key={template.id}>
              <div className="project-thumbnail">
                <span aria-hidden="true">{template.icon}</span>
                <span className="badge badge-primary">{template.ratio}</span>
              </div>
              <div className="project-card-content project-card-content-stacked">
                <div>
                  <h3>{template.title}</h3>
                  <p>{template.description}</p>
                </div>
                <button
                  type="button"
                  className="secondary-editor-button"
                  onClick={() => navigate({ to: "/entry" })}
                >
                  Use template
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
