import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  BarChart3,
  Settings,
  Globe,
  CreditCard,
  Mail,
  ShieldCheck,
  Server,
  Eye,
  LogOut,
  Menu,
  X
} from 'lucide-react'

// Import components we'll create
import TabNavigation from '@/components/admin/ControlCenter/TabNavigation'
import Dashboard from '@/components/admin/ControlCenter/Dashboard'
import IntegrationsPanel from '@/components/admin/ControlCenter/IntegrationsPanel'
import FinancialPanel from '@/components/admin/ControlCenter/FinancialPanel'
import EmailPanel from '@/components/admin/ControlCenter/EmailPanel'
import ApiPanel from '@/components/admin/ControlCenter/ApiPanel'
import MaintenancePanel from '@/components/admin/ControlCenter/MaintenancePanel'
import MonitoringPanel from '@/components/admin/ControlCenter/MonitoringPanel'

const tabs = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
  { id: 'integrations', name: 'Integrations', icon: Globe },
  { id: 'financial', name: 'Financial', icon: CreditCard },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'api', name: 'API', icon: ShieldCheck },
  { id: 'maintenance', name: 'Maintenance', icon: Server },
  { id: 'monitoring', name: 'Monitoring', icon: Eye },
]

export default function SuperAdminControlCenter() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [environment, setEnvironment] = useState('production')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    // Set active tab from URL query if present
    const { tab } = router.query
    if (tab && typeof tab === 'string' && tabs.find(t => t.id === tab)) {
      setActiveTab(tab)
    }
  }, [router.query])

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    router.push(
      {
        pathname: router.pathname,
        query: { tab: tabId }
      },
      undefined,
      { shallow: true }
    )
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || (session.user as any)?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-danger-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard environment={environment} />
      case 'integrations':
        return <IntegrationsPanel environment={environment} />
      case 'financial':
        return <FinancialPanel environment={environment} />
      case 'email':
        return <EmailPanel environment={environment} />
      case 'api':
        return <ApiPanel environment={environment} />
      case 'maintenance':
        return <MaintenancePanel environment={environment} />
      case 'monitoring':
        return <MonitoringPanel environment={environment} />
      default:
        return <Dashboard environment={environment} />
    }
  }

  return (
    <>
      <Head>
        <title>ParkingDirekt Control Center</title>
        <meta name="description" content="Super Admin Control Center for ParkingDirekt" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar */}
        <div className={`lg:hidden fixed inset-0 z-50 ${sidebarOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
            <div className="flex items-center justify-between h-16 px-4 border-b">
              <div className="flex items-center">
                <CogIcon className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-semibold text-gray-900">Control Center</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isMobile={true}
              />
            </nav>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <CogIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">Control Center</span>
            </div>

            <nav className="flex-1 px-2 space-y-1">
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isMobile={false}
              />
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top navigation */}
          <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200 lg:border-none">
            <button
              type="button"
              className="lg:hidden px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon className="h-6 w-6" />
            </button>

            <div className="flex-1 px-4 flex justify-between sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
              <div className="flex-1 flex">
                <div className="w-full flex md:ml-0">
                  <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                    <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                      <CogIcon className="h-5 w-5" />
                    </div>
                    <input
                      className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm bg-gray-50"
                      placeholder="Search settings..."
                      type="search"
                    />
                  </div>
                </div>
              </div>

              <div className="ml-4 flex items-center md:ml-6 space-x-4">
                {/* Environment selector */}
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>

                {/* User menu */}
                <div className="relative">
                  <div className="flex items-center space-x-3">
                    <div className="hidden md:block">
                      <div className="text-sm font-medium text-gray-900">
                        {session.user?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(session.user as any)?.role}
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {session.user?.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <LogoutIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Page header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                  {tabs.find(t => t.id === activeTab)?.name || 'Dashboard'}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {environment === 'production' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
                      Production Environment
                    </span>
                  )}
                  {environment === 'staging' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                      Staging Environment
                    </span>
                  )}
                  {environment === 'development' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                      Development Environment
                    </span>
                  )}
                </p>
              </div>

              {/* Tab content */}
              {renderActiveTab()}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}