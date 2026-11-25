import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, RefreshCw, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Can } from '../lib/permissions';
import { UsersWorkspace } from '../features/users/UsersWorkspace';

export const UsersPage: React.FC = () => {
  const [addSignal, setAddSignal] = useState(0);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-5 pb-12 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] mb-1">
            <Link to="/settings" className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-[var(--border-strong)]" />
            <span className="font-semibold text-[var(--text)]">Users</span>
          </nav>

          <h2 className="text-[24px] leading-tight font-semibold text-[var(--text)] tracking-tight">
            Users
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Manage user accounts, their roles and access
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshSignal((n) => n + 1)}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span>Refresh</span>
          </Button>
          <Can permission="users.manage">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddSignal((n) => n + 1)}
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </Button>
          </Can>
        </div>
      </div>

      <UsersWorkspace
        externalAddSignal={addSignal}
        externalRefreshSignal={refreshSignal}
        onLoadingChange={setLoading}
      />
    </div>
  );
};

export default UsersPage;
