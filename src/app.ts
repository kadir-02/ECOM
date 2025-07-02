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
import newsLetterRoutes from './routes/HomePageRoutes/newsletter.router';
// import emailRoutes from './routes/email.route';

dotenv.config();
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());


// app.use('/verify-email', emailRoutes);
app.use('/coupon', couponRoutes);
app.use('/frontend/testimonial',TestimonialRoutes)
app.use('/frontend', contactRoutes);
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
