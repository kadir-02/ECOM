import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import guestRoutes from './routes/guest.route';
import authRoutes from './routes/auth.route';
import adminRoutes from './routes/admin.route';
import userRoutes from './routes/user.route';
import passwordResetRoutes from './routes/passwordReset.route';
import productRoutes from './routes/ProductRoutes/product.route';
import categoryRoutes from './routes/category.route';
import cartRoutes from './routes/cart.route';
import addressRoutes from './routes/address.route';
import orderRoutes from './routes/order.route';
import paymentRoutes from './routes/payment.route';
import discountCodeRoutes from './routes/discountCode.routes';
import headerRoutes from './routes/HomePageRoutes/header.route';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler';
import './jobs/abandonedCartReminder'; 
import './jobs/cancelPendingOrders'; 
import bannerRoutes from './routes/banner.route';
import whyChooseUs from './routes/whyChooseUs.route';
import galleryRoutes from './routes/galleryItem.route';
import notificationRoutes from './routes/notification.route';
import gallerytypeRoutes from './routes/galleryType.route';
import galleryitemRoutes from './routes/galleryItem.route';
import companyRoutes from './routes/ComponySettingsRoutes/companySettings.route';
import TestimonialRoutes from './routes/TestimonialRoutes/testimonial.route';
import { globalErrorHandler } from './utils/globalErrorHandler';
import dashboardRoutes from './routes/dashboard.route';
import contactRoutes from './routes/contact.route';
import couponRoutes from './routes/coupon.route';
import pincodeRoutes from './routes/pincode.route';
import newsLetterRoutes from './routes/HomePageRoutes/newsletter.route';
import googleAnalyticsRoutes from './routes/googleAnalytics/googleAnalytics.route';
import counterRoutes from './routes/HomePageRoutes/homepageStatistic.route';
import productTagRoutes from './routes/ProductRoutes/productTag.route';
import taxRoutes from './routes/tax.route';
import shippingRoutes from './routes/shippingService.route';
import aboutRoutes from './routes/AboutUs/aboutUsSection.route';
import aboutComponentRoutes from './routes/AboutUs/aboutUsComponent.routes';
import storeRoutes from './routes/StoreAddress/store.route';
import abandonedCartRoutes from './routes/Abandoned/abandonedCartSetting.route';
import paymentServiceRoutes from './routes/PaymentService/paymentService.route';
import razorpayWebhookRoutes from './routes/razorpay.route'
// import emailRoutes from './routes/email.route';

dotenv.config();
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());


// app.use('/verify-email', emailRoutes);
app.use('/razorpay-webhook', razorpayWebhookRoutes);
app.use('/google-analytics', googleAnalyticsRoutes)
app.use('/homepage_statistics', counterRoutes)
app.use('/product-tag', productTagRoutes)
app.use('/tax', taxRoutes);
app.use('/shipping-service', shippingRoutes);
app.use('/about_us_section', aboutRoutes);
app.use('/about_us_component', aboutComponentRoutes);
app.use('/store', storeRoutes);
app.use('/abandoned-cart-setting', abandonedCartRoutes);
app.use('/payment-service', paymentServiceRoutes);
app.use('/pincode', pincodeRoutes);
app.use('/coupon', couponRoutes);
app.use('/frontend/testimonial',TestimonialRoutes)
app.use('/connect/', contactRoutes);
app.use('/newsletter', newsLetterRoutes);
app.use('/gallery', galleryRoutes);
app.use('/banners', bannerRoutes);
app.use('/why-choose-us', whyChooseUs);
app.use('/guest', guestRoutes);
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/password-reset', passwordResetRoutes);
app.use('/notifications', notificationRoutes);
app.use('/product', productRoutes);
app.use('/category', categoryRoutes);
app.use('/cart', cartRoutes);
app.use('/address', addressRoutes);
app.use('/order', orderRoutes);
app.use('/payment', paymentRoutes);
app.use('/discount-codes', discountCodeRoutes);
app.use('/header', headerRoutes);
app.use('/company-settings',companyRoutes)
app.use('/gallerytype',gallerytypeRoutes)
app.use('/galleryitem',galleryitemRoutes)
app.use('/', dashboardRoutes);


app.use(globalErrorHandler);
app.use(errorHandler);


export default app;
