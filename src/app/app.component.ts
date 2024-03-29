import { EnvExtension } from 'src/app/extensions/env';
import { Component, HostListener, ChangeDetectorRef, ChangeDetectionStrategy, Injector, AfterViewInit, ViewChild, afterNextRender } from '@angular/core';
import { Platform, ModalController, ToastController, AlertController, MenuController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { WzzStorage } from './fw/utils/wzz-storage';
import { register } from 'swiper/element/bundle';
import { ResizeExtension } from './fw/extensions/resize';
import { CompBase } from './fw/bases/comp/comp.base';
import { DeliveryExtension } from './extensions/delivery';
import { WzzMenuComponent } from './components/wzz-menu/wzz-menu.component';

register();

const ACCEPT_COOKIE_STORAGE_KEY: string = "accept_cookie";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent extends CompBase implements AfterViewInit {

  menuId: string = "app-menu";
  contentId: string = "app-content";

  @ViewChild("wzzMenu") wzzMenu!: WzzMenuComponent;

  constructor(
    public dExt: DeliveryExtension,
    public resizeExt: ResizeExtension,
    protected modalCtrl: ModalController,
    private platform: Platform,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private _menuCtrl: MenuController,
    protected router: Router,
    protected route: ActivatedRoute,
    protected override injector: Injector,
    public override cdRef: ChangeDetectorRef,
  ) {
    super(injector, cdRef);
    this.initializeApp();
  }

  async ngAfterViewInit() {
    this.resizeExt.resize$.subscribe(() => {
      this.cdRef.detectChanges();
    });
  }

  initializeApp() {
    afterNextRender(() => {
      this.platform.ready().then(async () => {
        const event = this.envExt?.eventsShoudan[0];
        const d = this.dExt.deliveryMethod;

        const adOpened = (event || d) && !this.envExt.isLogin();
        if (adOpened) {
          const { TopadPageModule } = await import("./modals/topad/topad.module");
          const modal = await this.modalCtrl.create({
            cssClass: "modal-t4",
            component: TopadPageModule.getPage(),
            componentProps: {
              event: event,
              d: d
            }
          });
          await modal.present();
        }

        this.eventsService.login$.subscribe(async () => {
          const { LoginModalPageModule } = await import("./modals/login-modal/login-modal.module");
          const modal = await this.createModal({
            component: LoginModalPageModule.getPage(),
            cssClass: "modal-t1"
          });
          await modal.present();
        });

        this.eventsService.showAlert$.subscribe(async (msg: string) => {
          if (!msg)
            return;

          const mapObj: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
          };

          msg = msg.replace(/(?:&|<|>)/gi, (matched) => {
            return mapObj[matched];
          });

          const toast = await this.alertCtrl.create({
            header: this.lang('Avviso'),
            message: msg,
            buttons: ['OK']
          });

          await toast.present();
        });

        this.eventsService.showMenu$.subscribe(async (topLevel) => {
          this.wzzMenu.topLevel = topLevel;
          await this._menuCtrl.enable(true, this.menuId);
          await this._menuCtrl.open(this.menuId);
        });

        WzzStorage.get(ACCEPT_COOKIE_STORAGE_KEY).then(async (b: boolean) => {
          if (!b) {
            const toast = await this.toastCtrl.create({
              header: this.lang("Avviso sull'utilizzo dei cookie"),
              message: this.lang("Questo sito Web utilizza cookie per marketing, analisi e per migliorare l'esperienza dell'utente. Per modificare le impostazioni dei cookie o saperne di più, consulta la sezione \"Cookie: Sito Web\" della nostra Informativa sulla privacy qui. Se continui a navigare nel nostro sito web, accetti questi cookie."),
              position: "bottom",
              layout: "stacked",
              color: 'light',
              cssClass: 'accept-cookie-toast',
              buttons: [{
                side: 'end',
                text: this.lang("Acceta tutto"),
                role: 'accept'
              }, {
                side: 'end',
                text: this.lang("Rifiuta tutto"),
                role: 'reject'
              }]
            });

            toast.onDidDismiss().then(() => {
              WzzStorage.set(ACCEPT_COOKIE_STORAGE_KEY, true);
            });

            await toast.present();
          }
        });
      });
    });

  }

  @HostListener("window:popstate", ['$event'])
  async onPopState(evt: any) {
    try {
      if (Date.now() - this.envExt.historyPopTime > 100) {
        const modal = await this.getModalCtrl().getTop();
        if (modal && !modal.classList.contains("modal-full")) {
          await modal.dismiss();
        }
      }
    } catch (e) { }
  }


  async onCloseMenu(menuId: string) {
    await this._menuCtrl.close(menuId);
  }

}
