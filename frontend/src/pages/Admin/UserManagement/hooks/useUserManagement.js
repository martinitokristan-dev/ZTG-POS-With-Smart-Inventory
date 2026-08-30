import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useRoles } from './useRoles';
import { useUserPermissions } from './useUserPermissions';
import { useCheckers } from './useCheckers';

export default function useUserManagement() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Determine whether we are in Checkers page or Roles & Permissions page based on sidebar URL
    const isCheckersPage = location.pathname.includes('/checkers');

    // Sub-view inside Roles & Permissions: 'roles' (System Roles) or 'staff' (Staff Accounts)
    const roleSubView = searchParams.get('sub') || 'roles';

    const setRoleSubView = (sub) => {
        setSearchParams({ sub });
    };

    const rolesHook = useRoles();
    const usersHook = useUserPermissions();
    const checkersHook = useCheckers();

    return {
        isCheckersPage,
        roleSubView,
        setRoleSubView,
        ...rolesHook,
        ...usersHook,
        ...checkersHook,
    };
}
