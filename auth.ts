import NextAuth, { NextAuthConfig } from 'next-auth';
import { authConfig } from './auth.config';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/db/prisma';
import { cookies } from 'next/headers';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';
import { NextResponse } from 'next/server';

// Document
// https://authjs.dev/getting-started/installation

export const config = {
  // Specify URLs to be used if you want to create custom sign in, sign out and error pages.
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  // Configure the session state
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // You would like to persist user / account data,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Mini Store System',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      authorize: async (credentials) => {

        if (credentials === null) return null;

        // Find user in database
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email as string,
          },
        });

        // Check if user exists and if the password matches
        if (user && user.password) {
          const isMatch = compareSync(
            credentials.password as string,
            user.password
          );

          // If password is correct, return user
          if (isMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        // If user does not exist or password does not match return null
        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // The session callback is called whenever a session is checked. By default, only a subset of the token is returned for increased security
    async session({ session, user, trigger, token }) {
      // Set the user ID from the token
      session.user.id = token.sub;
      session.user.role = token.role;
      session.user.name = token.name;

      // If there is an update, set the user name
      if (trigger === 'update') {
        session.user.name = user.name;
      }

      return session;
    },

    //This callback is called whenever a JSON Web Token is created (i.e. at sign in) or updated (i.e whenever a session is accessed in the client). The returned value will be encrypted, and it is stored in a cookie.
    async jwt({ token, user, trigger, session }) {
      // Assign user fields to token
      if (user) {
        token.id = user.id;
        token.role = user.role;

        // If user has no name then use the email
        if (user.name === 'NO_NAME') {
          token.name = user.email!.split('@')[0];

          // Update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          });
        }

        if (trigger === 'signIn' || trigger === 'signUp') {
          const cookiesObject = await cookies();
          const sessionCartId = cookiesObject.get('sessionCartId')?.value;

          if (sessionCartId) {
            const sessionCart = await prisma.cart.findFirst({
              where: { sessionCartId },
            });

            if (sessionCart) {
              // Delete current user cart
              await prisma.cart.deleteMany({
                where: { userId: user.id },
              });

              // Assign new cart
              await prisma.cart.update({
                where: { id: sessionCart.id },
                data: { userId: user.id },
              });
            }
          }
        }
      }

      // Handle session updates
      if (session?.user.name && trigger === 'update') {
        token.name = session.user.name;
      }

      return token;
    },

    // Middleware function provided by NextAuth
    // Doc:https://authjs.dev/reference/nextjs#authorized
    authorized({ request, auth }: any) {
      //Check for session cart cookie
      if (!request.cookies.get('sessionCartId')) {
        // Generate new session cart id cookie
        const sessionCartId = crypto.randomUUID();
        // Clone the req headers
        const newRequestHeaders = new Headers(request.headers)

        // Create new response and add the new headers
        const response = NextResponse.next({
          request: {
            headers: newRequestHeaders
          }
        });

        // Set newly generated sessionCartId in the response cookies
        response.cookies.set('sessionCartId', sessionCartId);

        return response;
      }
      else {
        return true;
      }
    }

  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config) 
