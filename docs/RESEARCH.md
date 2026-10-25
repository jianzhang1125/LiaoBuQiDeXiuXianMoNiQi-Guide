# 同类游戏攻略站研究与本次改进

调研日期：2026-10-24。目标是让这份《了不起的修仙模拟器》攻略适合边玩边查，并能通过GitHub Pages在手机和电脑访问。

## 参考站与观察

| 参考来源 | 实际观察 | 在本项目中的采用方式 |
| --- | --- | --- |
| [RimWorld Wiki：Guides](https://rimworldwiki.com/wiki/Guides) | 同时按进程、开局场景、生存问题、战斗和建设分类；新手路线和问题查阅并存。 | 保留阶段流程；首页增加“第一次玩/查看阶段路线/直接查机制”和常见问题入口。 |
| [RimWorld Wiki：Quickstart Guides](https://rimworldwiki.com/wiki/Quickstart_Guides) | 快速上手刻意省略大量深层分析，另链接更详尽的基础文档。 | 阶段默认展示目标与摘要，小节按需展开，深入机制交给Wiki。 |
| [Factorio Wiki：首页](https://wiki.factorio.com/Main_Page) | 新手、进阶、专家机制分层，常用术语和快速开始有直接入口；页面说明所基于的版本。 | 让问题入口直达机制，保留资料各自的版本、手游及路线限制，不虚构一个统一适用版本。 |
| [Factorio：Quick start guide](https://wiki.factorio.com/Tutorial:Quick_start_guide) | 以实际推进顺序串起操作，并将材料、设备和机制词链接到专门条目。 | 流程内术语直接链接Wiki，保留阶段准备和顺序目录。 |
| [bg3.wiki：首页](https://bg3.wiki/) | 章节概览与机制/角色/物品分类同屏存在，卡关时可先看章节，再转具体机制。 | 阶段路线和专题Wiki互相链接；新增“返回刚才的流程”，避免查完资料失去阅读位置。 |
| [Stardew Valley Wiki：首页](https://wiki.stardewvalley.net/Stardew_Valley_Wiki) | 起步、人物、技能、作物、季节等直接入口帮助按对象查阅。 | 首页提供问题与对象入口，保留人物、地图、功法、灵植等自然主题。Getting Started子页本次返回503，未将其内容作为依据。 |

本轮仅借鉴信息组织与阅读方式，不复制其他游戏攻略的正文、图标或游戏结论。

## 对现有页面的判断与已实现改进

1. **Wiki层级标签过多。** 改为桌面目录树、手机条目选择器，选中条目继续复用稳定深链接。资料仍融合在原主题中，没有恢复“新版资料”专区。
2. **查机制容易丢失流程位置。** 加入返回刚才流程的链接、当前条目路径和阶段前后导航。
3. **反复查同一内容不方便。** 提供可选收藏与最近查阅，保存于浏览器，既不计算完成率，也不要求记录任务状态。
4. **首页更适合浏览，不够适合临时求解。** 补充聚灵、结丹、80天防守、分神、纯阳和材料地点等问题入口。
5. **本地截图体积大。** 发布包保留原分辨率并转换为WebP质量92，原文件留在本地；检查每张图的分辨率和每条本地资源链接。正文搜索与放大继续可用。
6. **云端访问缺少入口。** 生成标准 `index.html`、相对资源路径和 `.nojekyll`，适配项目子路径与GitHub Pages。

## 发布依据

- [GitHub：Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)：支持静态文件，以index文件作为入口，可配置分支和目录；非Jekyll站点使用`.nojekyll`。
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)：发布网站大小限1GB，本次导出会记录体积并验证。

## 这轮不引入的复杂度

不恢复任务/完成度系统，不改游戏内容结论；暂不引入账号、后端和跨设备自动同步笔记。先提供稳定网址、可搜索内容、清晰导航和可导出的本地笔记。
