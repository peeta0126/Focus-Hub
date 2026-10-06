"use client";

import { SimpleManager, type SimpleEntity } from "@/components/common/SimpleManager";
import "../collection.css";
const initial: SimpleEntity[] = [];
export default function ResourcesPage() { return <main className="page-wrap"><div className="page-heading"><div><h1>자료 모음</h1><p>다시 찾고 싶은 개발 자료와 영감을 한곳에 모으세요.</p></div></div><SimpleManager table="resources" initial={initial} emptyText="유용한 자료를 저장해보세요." fields={[{ key: "title", label: "자료 이름", required: true }, { key: "url", label: "URL", type: "url", required: true }, { key: "description", label: "설명", type: "textarea" }, { key: "category", label: "카테고리", type: "select", options: ["개발", "디자인", "AI", "취업", "학습", "Blender", "기타"] }, { key: "tags", label: "태그" }, { key: "favorite", label: "즐겨찾기", type: "select", options: ["true", "false"] }]} renderMeta={(item) => `${item.favorite === "true" ? "★ " : ""}${item.category}`} toDatabase={(item, userId) => ({ id: item.id, user_id: userId, title: item.title, url: item.url, description: item.description, category: item.category, tags: String(item.tags).split(",").map((tag) => tag.trim()).filter(Boolean), favorite: item.favorite === "true" })} /></main>; }
