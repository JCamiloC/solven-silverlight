import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UsersService, User, UserInsert, UserUpdate } from '@/lib/services/users'

const QUERY_KEYS = {
  users: ['users'] as const,
  assignable: ['users', 'assignable'] as const,
  user: (id: string) => ['users', id] as const,
}

/**
 * Hook para obtener todos los usuarios
 */
export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: () => UsersService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para obtener usuarios que pueden ser asignados a tickets
 */
export function useAssignableUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.assignable,
    queryFn: () => UsersService.getAssignableUsers(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para obtener un usuario específico
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.user(id),
    queryFn: () => UsersService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para crear usuario
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UserInsert) => UsersService.create(data),
    onMutate: async (newUser) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.users })

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<User[]>(QUERY_KEYS.users)

      // Optimistically update
      const optimisticUser: User = {
        id: `temp-${Date.now()}`,
        ...newUser,
        email: `${newUser.first_name.toLowerCase()}.${newUser.last_name.toLowerCase()}@empresa.com`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        totp_enabled: false
      }

      queryClient.setQueryData<User[]>(
        QUERY_KEYS.users,
        (old) => old ? [optimisticUser, ...old] : [optimisticUser]
      )

      return { previousUsers }
    },
    onError: (error, newUser, context) => {
      // Rollback
      queryClient.setQueryData(QUERY_KEYS.users, context?.previousUsers)
      toast.error('Error al crear usuario', {
        description: error.message,
      })
    },
    onSuccess: (data) => {
      toast.success('Usuario creado exitosamente', {
        description: `${data.first_name} ${data.last_name} ha sido agregado al sistema`,
      })
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignable })
    },
  })
}

/**
 * Hook para actualizar usuario
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) =>
      UsersService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.users })
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.user(id) })

      // Snapshot previous values
      const previousUsers = queryClient.getQueryData<User[]>(QUERY_KEYS.users)
      const previousUser = queryClient.getQueryData<User>(QUERY_KEYS.user(id))

      // Optimistically update users list
      queryClient.setQueryData<User[]>(
        QUERY_KEYS.users,
        (old) =>
          old?.map((user) =>
            user.id === id 
              ? { ...user, ...data, updated_at: new Date().toISOString() }
              : user
          ) || []
      )

      // Optimistically update single user
      if (previousUser) {
        queryClient.setQueryData<User>(
          QUERY_KEYS.user(id),
          { ...previousUser, ...data, updated_at: new Date().toISOString() }
        )
      }

      return { previousUsers, previousUser }
    },
    onError: (error, { id }, context) => {
      // Rollback
      queryClient.setQueryData(QUERY_KEYS.users, context?.previousUsers)
      queryClient.setQueryData(QUERY_KEYS.user(id), context?.previousUser)
      toast.error('Error al actualizar usuario', {
        description: error.message,
      })
    },
    onSuccess: (data) => {
      toast.success('Usuario actualizado', {
        description: `${data.first_name} ${data.last_name} ha sido actualizado`,
      })
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignable })
    },
  })
}

/**
 * Hook para eliminar usuario
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => UsersService.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.users })

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<User[]>(QUERY_KEYS.users)

      // Optimistically update
      queryClient.setQueryData<User[]>(
        QUERY_KEYS.users,
        (old) => old?.filter((user) => user.id !== id) || []
      )

      return { previousUsers }
    },
    onError: (error, id, context) => {
      // Rollback
      queryClient.setQueryData(QUERY_KEYS.users, context?.previousUsers)
      toast.error('Error al eliminar usuario', {
        description: error.message,
      })
    },
    onSuccess: () => {
      toast.success('Usuario eliminado', {
        description: 'El usuario ha sido eliminado del sistema',
      })
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignable })
    },
  })
}

/**
 * Hook para desactivar usuario (opcional - solo si lo necesitas)
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => UsersService.deactivate(id),
    onSuccess: () => {
      toast.success('Usuario desactivado', {
        description: 'El usuario ha sido desactivado del sistema',
      })
    },
    onError: (error) => {
      toast.error('Error al desactivar usuario', {
        description: error.message,
      })
    },
    onSettled: () => {
      // Refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignable })
    },
  })
}