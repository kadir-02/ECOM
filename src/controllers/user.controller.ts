import { Request, Response } from 'express';
import prisma from '../db/prisma';
import bcrypt from 'bcryptjs';
import { CustomRequest } from '../middlewares/authenticate';
import cloudinary from '../upload/cloudinary'; // Cloudinary client config

// Helper to delete Cloudinary image by public ID
const deleteCloudinaryImage = async (imageUrl: string) => {
  try {
    // Extract public ID from URL, e.g.:
    // https://res.cloudinary.com/demo/image/upload/v1234567890/folder/file.jpg
    // public ID = "folder/file"
    const urlParts = imageUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1]; // "file.jpg"
    const folder = urlParts[urlParts.length - 2]; // "folder" (if used)
    const publicId = `${folder}/${lastPart.split('.')[0]}`; // remove extension

    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Failed to delete Cloudinary image:', err);
  }
};

export const deleteOwnAccount = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    // 1. Get orders for user
    const orders = await prisma.order.findMany({
      where: { userId },
      select: { id: true, paymentId: true },
    });

    if (orders.length === 0) {
      console.log(`No orders found for userId ${userId}`);
    } else {
      console.log(`Found ${orders.length} orders for userId ${userId}`);
    }

    const orderIds = orders.map(o => o.id);
    const paymentIds = orders.map(o => o.paymentId).filter((id): id is number => id !== null);

    if (orderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      console.log(`Deleted order items for orders: ${orderIds.join(', ')}`);
    } else {
      console.log('No order items to delete');
    }

    if (paymentIds.length > 0) {
      await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
      console.log(`Deleted payments: ${paymentIds.join(', ')}`);
    } else {
      console.log('No payments to delete');
    }

    if (orderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      console.log(`Deleted orders: ${orderIds.join(', ')}`);
    } else {
      console.log('No orders to delete');
    }

    // 2. Delete addresses
    const addressesDeleted = await prisma.address.deleteMany({ where: { userId } });
    console.log(`Deleted ${addressesDeleted.count} addresses`);

    // 3. Delete cart and cart items
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      console.log(`Found cart with id ${cart.id} for userId ${userId}`);

      const cartItemsDeleted = await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      console.log(`Deleted ${cartItemsDeleted.count} cart items`);

      await prisma.cart.delete({ where: { id: cart.id } });
      console.log(`Deleted cart with id ${cart.id}`);
    } else {
      console.log(`No cart found for userId ${userId}`);
    }

    // 4. Delete discount codes and notifications
    const discountCodesDeleted = await prisma.discountCode.deleteMany({ where: { userId } });
    console.log(`Deleted ${discountCodesDeleted.count} discount codes`);

    const notificationsDeleted = await prisma.notification.deleteMany({ where: { userId } });
    console.log(`Deleted ${notificationsDeleted.count} notifications`);

    // 5. Delete profile image if any
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      console.log(`User with id ${userId} not found`);
       res.status(404).json({ message: "User not found" });
       return
    }

    if (user.profile?.imageUrl) {
      console.log(`Deleting cloudinary image at url: ${user.profile.imageUrl}`);
      await deleteCloudinaryImage(user.profile.imageUrl);
    } else {
      console.log('No profile image to delete');
    }

    // 6. Delete profile if exists
    if (user.profileId) {
      await prisma.profile.delete({ where: { id: user.profileId } });
      console.log(`Deleted profile with id ${user.profileId}`);
    } else {
      console.log('No profile to delete');
    }

    // 7. Delete user
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      console.log(`User with id ${userId} no longer exists before delete.`);
       res.status(404).json({ message: "User already deleted" });
       return
    }
    await prisma.user.delete({ where: { id: userId } });
    console.log(`Deleted user with id ${userId}`);

    res.json({ message: "Your account has been deleted" });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
};

interface JwtPayload {
  userId: number;
  role: 'USER' | 'ADMIN';
}
export interface UpdateRequest extends Request {
  user?: JwtPayload;
  file?: Express.Multer.File;
}

export const updateOwnProfile = async (req: UpdateRequest, res: Response) => {
  const userId = req.user?.userId;
  const { firstName, lastName, bio } = req.body;

  if (!userId) {
     res.status(401).json({ message: 'Unauthorized' });
     return
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      include: { profile: true },
    });

    if (!user?.profile || !user.profileId) {
       res.status(404).json({ message: 'Profile not found' });
       return
    }

    const profileUpdateData: any = { firstName, lastName, bio };

    if (req.file) {
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'profile_images' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result as { secure_url: string });
          }
        );
        stream.end(req.file!.buffer); // `!` is safe here due to `if (req.file)`
      });

      profileUpdateData.imageUrl = uploadResult.secure_url;
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: user.profileId },
      data: profileUpdateData,
    });

    res.json({ message: 'Your profile updated', profile: updatedProfile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const changePassword = async (req: CustomRequest, res: Response): Promise<void> => {
  const { oldPassword, newPassword } = req.body;

  if (!req.user) {
     res.status(401).json({ message: 'Unauthorized' });
     return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
       res.status(404).json({ message: 'User not found' });
       return;
    }

    if (!user.password) {
       res.status(400).json({ message: 'Password not set for this user' });
       return;
    }

    const isValid = await bcrypt.compare(oldPassword, user.password);

    if (!isValid) {
       res.status(400).json({ message: 'Old password is incorrect' });
       return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMe = async (req: CustomRequest, res: Response) => {
  if (!req.user) {
     res.status(401).json({ message: 'Unauthorized' });
     return
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user.userId, isDeleted: false },
      include: { profile: true },
    });

    if (!user) {
       res.status(404).json({ message: 'User not found' });
       return
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      bio: user.profile?.bio ?? null,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      imageUrl: user.profile?.imageUrl ?? null,
    });
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const softDeleteOwnAccount = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
     res.status(401).json({ message: 'Unauthorized' });
     return
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true },
    });

    res.json({ message: 'Your account has been soft deleted' });
  } catch (error) {
    console.error('Error soft deleting account:', error);
    res.status(500).json({ message: 'Failed to soft delete account' });
  }
};

export const restoreOwnAccount = async (req: CustomRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
     res.status(401).json({ message: 'Unauthorized' });
     return
  }

  try {
    const restoredUser = await prisma.user.update({
      where: { id: userId },
      data: { isDeleted: false },
    });

    res.json({ message: 'Your account has been restored', user: restoredUser });
  } catch (error) {
    console.error('Error restoring account:', error);
    res.status(500).json({ message: 'Failed to restore account' });
  }
};
