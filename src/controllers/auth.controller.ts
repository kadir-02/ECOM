import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import prisma from '../db/prisma';
import { uploadToCloudinary } from '../utils/uploadToCloudinary';

export const register = async (req: Request, res: Response) => {
  const { email, password, profile, address } = req.body;

  // Parse profile from FormData string if needed
  let profileData = profile;
  if (typeof profile === 'string') {
    try {
      profileData = JSON.parse(profile);
    } catch {
       res.status(400).json({ message: 'Invalid profile format' });
       return
    }
  }

  // Parse address from FormData string if needed
  let addressData = address;
  if (typeof address === 'string') {
    try {
      addressData = JSON.parse(address);
    } catch {
       res.status(400).json({ message: 'Invalid address format' });
       return
    }
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
       res.status(400).json({ message: 'User already exists' });
       return
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let imageUrl: string | null = null;
    let publicId: string | null = null;

    // Upload image to Cloudinary if file exists
    if (req.file?.buffer) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'users');
      imageUrl = uploadResult.secure_url;
      // publicId = uploadResult.public_id;
    }

    // Prepare address creation data
    const formattedAddresses = addressData
      ? Array.isArray(addressData)
        ? addressData
        : [addressData]
      : [];

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'USER',
        profile: {
          create: {
            ...profileData,
            imageUrl,
            // publicId,
          },
        },
        addresses: {
          create: formattedAddresses.map((addr) => ({
            fullName: addr.fullName,
            phone: addr.phone,
            pincode: addr.pincode,
            state: addr.state,
            city: addr.city,
            addressLine: addr.addressLine,
            landmark: addr.landmark ?? '',
            type: addr.type ?? 'SHIPPING',
            isDefault: addr.isDefault ?? true,
          })),
        },
      },
      include: {
        profile: true,
        addresses: true,
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      userId: user.id,
      user,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const login = async (req: Request, res: Response) => {
  const { email, password, admin } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !user.password) {
       res.status(400).json({ message: 'Invalid credentials' });
       return
    }

    if(admin==='ADMIN'){
      if(user.role!=='ADMIN'){
        res.status(403).json({message:"user is not admin"})
        return;
      }
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
       res.status(400).json({ message: 'Invalid credentials' });
       return
    }

    if (user.isDeleted) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isDeleted: false },
      });
    }

    const token = generateToken({ userId: user.id, role: user.role });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.firstName ?? null,
        lastName: user.profile?.lastName ?? null,
        imageUrl: user.profile?.imageUrl ?? null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
