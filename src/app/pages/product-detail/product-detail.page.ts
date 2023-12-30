import { Product } from './../../utils/product';
import { RouterLinkExtension } from 'src/app/extensions/router-link';
import { ResizeExtension } from './../../extensions/resize';
import { ProductPropComponent } from './../../components/product-prop/product-prop.component';
import { ProductPropService } from './../../services/product-prop.service';
import { Component, ChangeDetectorRef, ChangeDetectionStrategy, AfterViewInit, ViewChild, Injector, ElementRef } from '@angular/core';
import { CompBase } from 'src/app/fw/bases/comp/comp.base';
import { ActivatedRoute } from '@angular/router';
import { IProduct, IProductProp, ICart } from 'src/app/interfaces/i-data';
import { ProductService } from 'src/app/services/product.service';
import { DeliveryExtension } from 'src/app/extensions/delivery';
import { IonContent, NavController } from '@ionic/angular';
import { ProductExtension } from 'src/app/extensions/product';
import Swiper from 'swiper';
import { CartService } from 'src/app/services/cart.service';
import { SendOrderPage } from 'src/app/modals/send-order/send-order.page';
import { SUCCESS_MESSAGE } from 'src/app/fw/const/const';

const IMAGE_LIST_WIDTH = 80;
const IMAGE_THUMB_NUM = 6.5;

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.page.html',
  styleUrls: ['./product-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailPage extends CompBase implements AfterViewInit {

  showThumbDirBtn!: boolean;

  props!: { [key: string]: IProductProp };
  id!: string;
  idno!: string;

  data!: IProduct;

  hotProducts!: IProduct[];
  thumbImgPaths!: string[];
  origImgPaths!: string[];
  selectedImageIndex?: number;

  imageThumbNum = IMAGE_THUMB_NUM;
  imageListWidth: number = IMAGE_LIST_WIDTH;
  imageWidth!: number;
  imageHeight!: number;

  lastCart!: ICart;

  gifts: (IProduct | undefined)[] = [undefined, undefined, undefined, undefined, undefined, undefined];

  @ViewChild(IonContent) content!: IonContent;
  @ViewChild(ProductPropComponent) productPropEl!: ProductPropComponent;

  @ViewChild("i1SwiperRef") i1SwiperRef!: ElementRef;

  constructor(
    public dExt: DeliveryExtension,
    public routerLinkExt: RouterLinkExtension,
    public resizeExt: ResizeExtension,
    public productExt: ProductExtension,
    public cartService: CartService,
    private productPropService: ProductPropService,
    private service: ProductService,
    private _navCtrl: NavController,
    private route: ActivatedRoute,
    protected override injector: Injector,
    public override cdRef: ChangeDetectorRef
  ) {
    super(injector, cdRef);
  }

  async ngAfterViewInit() {
    const paramMap = this.route.snapshot.paramMap;
    this.id = paramMap.get("id") ?? "";
    this.idno = paramMap.get("idno") ?? "";

    this.loadingService.run(async () => {
      [this.props] = await Promise.all([
        this.productPropService.getData(),
        this._reload()
      ]);

      const imageThumbHeight = IMAGE_LIST_WIDTH;
      this.imageHeight = imageThumbHeight * IMAGE_THUMB_NUM + 12 * (Math.floor(IMAGE_THUMB_NUM));
      this.imageWidth = this.imageHeight;
      this.showThumbDirBtn = this.data.ImageCount! > IMAGE_THUMB_NUM;

      this.visible = true;
      this.cdRef.detectChanges();

      this.cdRef.detach();
    }, false);

    this.service.getGifts({ page: 1, pageSize: 5 }).then((res) => {
      this.gifts = res?.topics ?? [];
      this.cdRef.detectChanges();
    });

    this.subscription.add(this.resizeExt.resize$.subscribe(() => {
      this.cdRef.detectChanges();
    }));
  }

  get i1SwiperEl(): Swiper | undefined {
    return this.i1SwiperRef?.nativeElement?.swiper;
  }

  onSwipeImage() {
    this.onChangeImage(this.i1SwiperEl?.activeIndex);
  }

  onChangeImage(index?: number) {
    this.selectedImageIndex = index;
    this.cdRef.detectChanges();
  }

  onGotoApp() {
    // const url = `://api.istarhub.com/open-app/${this.envExt.appId}?url=${JSON.stringify({ type: "product", idno: this.data.idno })}`;
    // const location = this.getDocument().location;
    // location.href = (this._isIOS ? "https" : "istar") + url;
  }

  onInsertQuantity() {
    this.getMessageExt().prompt({
      message: this.lang("请输入数量"),
      inputs: [{ type: "number", name: "val", value: this.lastCart.Quantity }],
      success: ({ val }: any) => {
        val = parseInt(val);
        if (isNaN(val))
          return;

        this.productPropEl.changeQuantity(val - this.lastCart.Quantity!);
      }
    });
  }

  onChangeProp({ lastCart, imgPath = undefined }: any) {
    let foundIndex = 0;
    if (!!imgPath) {
      foundIndex = this.origImgPaths.findIndex(item => item == imgPath);
      if (foundIndex == -1)
        foundIndex = 0;
    }

    this.lastCart = lastCart;

    this.cdRef.detectChanges();

    const tid = setTimeout(() => {
      clearTimeout(tid);

      this.i1SwiperEl?.slideTo(foundIndex, this.selectedImageIndex === undefined ? 0 : 300);

      this.selectedImageIndex = foundIndex;
      this.cdRef.detectChanges();
    }, 100);

  }

  async onChangeQuantity(quantity: number) {
    await this.productPropEl.changeQuantity(quantity);
    this.getMessageExt().confirm({
      message: this.lang(SUCCESS_MESSAGE),
      successText: this.lang("Vedi carrello"),
      success: () => {
        this._navCtrl.navigateForward(this.routerLinkExt.translate([this.language, "cart"]));
      }
    });
  }

  async onDirectCheckout() {
    const lastCart = this.lastCart;

    if (!this.envExt.isLogin()) {
      this.eventsService.login$.next();
      return;
    }

    const carts = this.cartService.getCarts();
    const uniqueKey = lastCart.uniqueKey!;
    const cart = carts[uniqueKey];

    if (!cart.Quantity) {
      this.getMessageExt().alert(this.lang("Seleziona almenu un prodotto"));
      return;
    }

    const modal = await this.createModal({
      component: SendOrderPage,
      cssClass: 'modal-t2',
      componentProps: {
        selecteds: { [uniqueKey]: cart }
      }
    });

    modal.present();
  }

  private async _reload() {
    const res = await this.service.getOne(this.id, {
      idno: this.idno,
      relativeLen: 4
    });

    this.data = res?.topics ?? {};
    this.hotProducts = res?.extra ?? [];

    // this.hotProducts.unshift(Utility.clone(this.data));

    if (!!this.data)
      [this.thumbImgPaths, this.origImgPaths] = Product.getImgPaths(this.data);
  }
}
