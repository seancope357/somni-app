'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Mail, Lock, User } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AuthFormProps {
  onAuthSuccess: () => void
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!supabase) {
      toast({
        title: "Configuration Error",
        description: "Supabase is not configured. Please check your environment variables.",
        variant: "destructive"
      })
      setIsLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        if (error) throw error
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to DREAMONEIR.",
        })
        onAuthSuccess()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Card className="border-0 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Subtle gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-purple-500/20 rounded-3xl"></div>
        <div className="absolute inset-[1px] bg-slate-900/40 backdrop-blur-xl rounded-3xl"></div>
        
        <div className="relative z-10">
          <CardHeader className="text-center pb-6 pt-8 px-8">
            <CardTitle className="text-2xl font-light text-white tracking-wide">
              {isSignUp ? 'Begin Your Journey' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-slate-300/70 mt-2 text-sm">
              {isSignUp ? 'Create your account to start exploring your dreams' : 'Continue your journey of self-discovery'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleAuth} className="space-y-5">
              {isSignUp && (
                <div className="group">
                  <label className="block text-xs font-medium text-slate-300/80 mb-2 tracking-wide uppercase">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-purple-400" />
                    <Input
                      type="text"
                      placeholder="Enter your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-12 pr-4 py-6 border-0 bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-slate-400/50 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-purple-500/50"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}
              
              <div className="group">
                <label className="block text-xs font-medium text-slate-300/80 mb-2 tracking-wide uppercase">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-purple-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 pr-4 py-6 border-0 bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-slate-400/50 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-purple-500/50"
                    required
                  />
                </div>
              </div>
              
              <div className="group">
                <label className="block text-xs font-medium text-slate-300/80 mb-2 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-purple-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-4 py-6 border-0 bg-white/5 hover:bg-white/10 focus:bg-white/10 text-white placeholder:text-slate-400/50 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-purple-500/50"
                    required
                    minLength={6}
                  />
                </div>
                {!isSignUp && (
                  <div className="text-right mt-2">
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-purple-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-medium py-6 rounded-xl shadow-lg shadow-purple-500/30 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-purple-500/50 active:scale-[0.98] mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isSignUp ? 'Creating Your Account...' : 'Signing You In...'}
                  </>
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <span className="ml-2 text-lg">→</span>
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-center text-sm text-slate-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full mt-3 text-sm font-medium text-purple-300 hover:text-white transition-colors py-2 rounded-lg hover:bg-white/5"
              >
                {isSignUp ? 'Sign in instead' : 'Create a free account'}
              </button>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}