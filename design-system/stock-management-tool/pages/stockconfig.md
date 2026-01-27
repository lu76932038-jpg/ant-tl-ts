# Stockconfig Page Overrides (Modern Warehouse Edition)

> **PROJECT:** Stock Management Tool
> **Theme:** Modern Industrial Warehouse Command Center
> **Style:** Glassmorphism + Dark High-Contrast
> **Updated:** 2026-01-24

---

## 1. Design Philosophy

将页面打造为一个“仓库指挥中心”，模拟工业监控屏。强调：

- **实时感**: 动态数值跳动和流动边框。
- **秩序感**: 便当格 (Bento Grid) 布局，功能分区明确。
- **工业美学**: 特种字体 (Fira Code)、机械感线条、警示色点缀。

---

## 2. Visual Palette

| Role | Hex | Purpose |
|------|-----|---------|
| Base Background | #05070A | 极黑背景，营造沉浸感 |
| Surface (Card) | rgba(15, 23, 42, 0.7) | 玻璃拟态深色卡片，边框 1px solid rgba(255,255,255,0.1) |
| Accent (Primary) | #3B82F6 | 科技蓝，用于主流程 |
| Warning (Stock) | #F97316 | 工业橘，表示备货、预警或动作 |
| Text Primary | #F8FAFC | 极白文字，高对比度 |
| Text Muted | #94A3B8 | 辅助说明，低干扰 |

---

## 3. Layout Structure (3-Column Command)

- **Column 1 (Strategic Context)**: 销售预测、历史趋势图表。
- **Column 2 (Configuration Core)**: 库存策略、补货参数配置。
- **Column 3 (Decision Support)**: 模拟结果预览、仿真流水。
- **Bottom Bar**: 浮动命令栏 (Action Bar) 置底，包含“保存配置”和“触发同步”按钮。

---

## 4. Components & Effects

- **Bento Cards**: 每一格都有 subtle scanline overlay (扫描线效果)。
- **Status Pills**: 带有小呼吸灯效果的标签（如：[● 同步中]）。
- **Typing Effect**: 重要配置加载时带有轻微的字符跳动效果。
- **Glass Blur**: `backdrop-blur-xl` 增强图层深度感。

---

## 5. Typography

- **Headings**: `Fira Code` (Monospace for data feeling)
- **Body**: `Inter` / `Outfit` (Modern sans-serif)

---

## 6. Anti-Patterns to Avoid

- 🚫 禁止使用纯白背景。
- 🚫 禁止使用圆角过大的卡片（建议 8px-12px，保持硬朗硬朗）。
- 🚫 禁止使用渐变色过杂的配色方案。
