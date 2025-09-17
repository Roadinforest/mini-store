'use server';

import {
  //   shippingAddressSchema,
  signInFormSchema,
    signUpFormSchema,
  //   paymentMethodSchema,
  //   updateUserSchema,
} from '../validators';
import { auth, signIn, signOut } from '@/auth';
import { hashSync } from 'bcrypt-ts-edge';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
// import { hash } from '../encrypt';
import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
// import { formatError } from '../utils';
// import { ShippingAddress } from '@/types';
// import { z } from 'zod';
// import { PAGE_SIZE } from '../constants';
// import { revalidatePath } from 'next/cache';
// import { Prisma } from '@prisma/client';
// import { getMyCart } from './cart.actions';

// Sign in the user with credentials
export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', user);

    return { success: true, message: 'Signed in successfully' };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: 'Invalid email or password' };
  }
}

// Sign user out
export async function signOutUser() {
    await signOut();
  // get current users cart and delete it so it does not persist to next user
  //   const currentCart = await getMyCart();

  //   if (currentCart?.id) {
  //     await prisma.cart.delete({ where: { id: currentCart.id } });
  //   } else {
  //     console.warn('No cart found for deletion.');
  //   }
}

// Sign up user
export async function signUpUser(prevState: unknown, formData: FormData) {
  try {
    const user = signUpFormSchema.parse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });

    const plainPassword = user.password;

    user.password = await hashSync(user.password);

    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
      },
    });

    await signIn('credentials', {
      email: user.email,
      password: plainPassword,
    });

    return { success: true, message: 'User registered successfully' };
  } catch (error) {

    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: formatError(error)};
  }
}
