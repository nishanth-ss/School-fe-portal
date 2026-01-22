import { useMutation, useQuery } from "@tanstack/react-query";
import { createLocation, getLocations, saveBackupConfig, updateLocation } from "../service/locationService";

export const useLocationsQuery = (enabled) =>
  useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    enabled,       // only run after login
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

export const useLocationMutation = () =>
  useMutation({
    mutationFn: async ({ isEdit, selectedLocation, payload }) => {
      if (isEdit) {
        return updateLocation({
          id: selectedLocation._id,
          payload,
        });
      }
      return createLocation(payload);
    },
  });

  // DB
  export const useSaveBackupMutation = () =>
  useMutation({
    mutationFn: saveBackupConfig,
  });
