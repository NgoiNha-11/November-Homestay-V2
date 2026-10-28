import type { Branch } from '../../domain/catalog';
import { esc } from '../../shared/dom';
import { mapLink } from '../../shared/config';

export function branchView(branch: Branch): string {
  return `<article class="branch-card">
<a class="branch-image" href="?branch=${encodeURIComponent(branch.id)}#rooms" data-branch="${esc(branch.id)}"><img src="${esc(branch.cover)}" alt="Chi nhánh ${esc(branch.name)}" loading="lazy" width="600" height="800"></a>
<div class="branch-info">
<div class="branch-summary">
<h3>${esc(branch.name)}</h3>
<p class="branch-stats"><span>Số phòng: ${branch.roomCount}</span><span><span>Số tầng: ${branch.floors}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h6v-6h6V8h6M3 23h20V3"/></svg></span></p>
<p class="branch-address">${esc(branch.address)}</p>
</div>
<div class="branch-description">
<h4>Tổng quan</h4>
<p class="branch-overview" id="branch-overview-${esc(branch.id)}">${esc(branch.overview)}</p>
<button type="button" class="branch-overview-toggle" aria-expanded="false" aria-controls="branch-overview-${esc(branch.id)}">Xem thêm</button>
<details class="branch-facilities"><summary>Xem thêm dịch vụ và cơ sở vật chất</summary><ul>${branch.facilities.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></details>
<div class="branch-links"><a href="?branch=${encodeURIComponent(branch.id)}#rooms" data-branch="${esc(branch.id)}">Xem phòng ↗</a><a href="${mapLink(branch)}" target="_blank" rel="noopener">Chỉ đường ↗</a></div>
</div></div></article>`;
}
