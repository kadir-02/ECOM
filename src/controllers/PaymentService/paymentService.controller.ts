import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { getUserNameFromToken } from '../../utils/extractName';

export const getAllPaymentServices = async (_req: Request, res: Response) => {
  try {
    const services = await prisma.paymentService.findMany({
      orderBy: { updated_at: 'desc' },
    });

    const response: Record<string, any> = {
      'cash_on_delivery': {},
      'paypal': {},
      'razorpay': {},
      'cashfree': {},
      'authorize.net': {},
      'stripe': {},
      'hyperpay': {},
    };

    for (const service of services) {
      const formatted = {
        id: service.id,
        name: service.name,
        url: service.url,
        is_active: service.is_active,
        created_by: service.created_by,
        created_at: service.created_at,
        updated_by: service.updated_by,
        updated_at: service.updated_at,
        start_date: service.start_date,
        end_date: service.end_date,
      };

      switch (service.name.toLowerCase()) {
        case 'cash on delivery':
          response['cash_on_delivery'] = formatted;
          break;
        case 'paypal':
          response['paypal'] = {
            ...formatted,
            paypal_client_id: service.paypal_client_id,
            paypal_secret: service.paypal_secret,
          };
          break;
        case 'razorpay':
          response['razorpay'] = {
            ...formatted,
            razorpay_key_id: service.razorpay_key_id,
            razorpay_key_secret: service.razorpay_key_secret,
          };
          break;
        case 'cashfree':
          response['cashfree'] = {
            ...formatted,
            cashfree_client_id: service.cashfree_client_id,
            cashfree_client_secret: service.cashfree_client_secret,
          };
          break;
        case 'authorize.net':
          response['authorize.net'] = {
            ...formatted,
            authorize_net_login_id: service.authorize_net_login_id,
            authorize_net_transaction_key: service.authorize_net_transaction_key,
          };
          break;
        case 'stripe':
          response['stripe'] = {
            ...formatted,
            stripe_publishable_key: service.stripe_publishable_key,
            stripe_secret_key: service.stripe_secret_key,
          };
          break;
        case 'hyperpay':
          response['hyperpay'] = {
            ...formatted,
            hyperpay_entity_id: service.hyperpay_entity_id,
            hyperpay_access_token: service.hyperpay_access_token,
          };
          break;
      }
    }

    res.json({ payment_services: response });
  } catch (err) {
    console.error('Get payment services error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createOrUpdatePaymentService = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const user = await getUserNameFromToken(req);

    const existing = await prisma.paymentService.findFirst({
      where: { name: payload.name },
    });

    const data = {
      ...payload,
      created_by: existing?.created_by || user,
      updated_by: user,
    };

    let result;
    if (existing) {
      result = await prisma.paymentService.update({
        where: { id: existing.id },
        data,
      });
    } else {
      result = await prisma.paymentService.create({ data });
    }

    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error('Create/update payment service error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPaymentServicesFrontend = async (_req: Request, res: Response) => {
  try {
    const services = await prisma.paymentService.findMany({
      where: { is_active: true },
      orderBy: { updated_at: 'desc' },
    });

    const activeServiceNames: string[] = services.map(service =>
      service.name.toLowerCase().replace(/ /g, '_')
    );

    res.json({ active_payment_services: activeServiceNames });
  } catch (err) {
    console.error('Get payment services error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
