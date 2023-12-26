import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector } from '@angular/core';
import { ResizeExtension } from 'src/app/extensions/resize';
import { RouterLinkExtension } from 'src/app/extensions/router-link';
import { PageBase } from 'src/app/fw/bases/page/page.base';

@Component({
  selector: 'app-return-rule',
  templateUrl: './return-rule.page.html',
  styleUrls: ['./return-rule.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReturnRulePage extends PageBase implements AfterViewInit {

  constructor(
    public routerLinkExt: RouterLinkExtension,
    public resizeExt: ResizeExtension,
    protected override injector: Injector,
    public override cdRef: ChangeDetectorRef
  ) {
    super(injector, cdRef);
  }

  async ngAfterViewInit() {
    this.cdRef.detach();

    this.visible = true;
    this.cdRef.detectChanges();

    this.subscription.add(this.resizeExt.resize$.subscribe(() => {
      this.cdRef.detectChanges();
    }));
  }

  protected async paging(reset: boolean = false) {
  }

}
