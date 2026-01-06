'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Users, CheckCircle2, XCircle, Briefcase, Clock } from 'lucide-react'

interface DevWithDetails {
  id: string
  name: string
  email: string
  availability?: {
    is_available: boolean
    available_hours_per_week: number
    headline: string | null
  }
  skills?: { skill: string; proficiency: number }[]
  assigned_projects_count?: number
  total_hours_logged?: number
}

interface AdminDevDirectoryProps {
  devs: DevWithDetails[]
}

export function AdminDevDirectory({ devs }: AdminDevDirectoryProps) {
  const [search, setSearch] = useState('')
  const [filterAvailability, setFilterAvailability] = useState<string>('all')

  // Filter devs
  let filteredDevs = devs

  if (search) {
    const searchLower = search.toLowerCase()
    filteredDevs = filteredDevs.filter(
      d => d.name.toLowerCase().includes(searchLower) ||
           d.email.toLowerCase().includes(searchLower) ||
           d.skills?.some(s => s.skill.toLowerCase().includes(searchLower))
    )
  }

  if (filterAvailability === 'available') {
    filteredDevs = filteredDevs.filter(d => d.availability?.is_available)
  } else if (filterAvailability === 'unavailable') {
    filteredDevs = filteredDevs.filter(d => !d.availability?.is_available)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAvailability} onValueChange={setFilterAvailability}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dev List */}
      <Card>
        <CardHeader>
          <CardTitle>Developers ({filteredDevs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDevs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No developers found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Developer</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevs.map((dev) => (
                  <TableRow key={dev.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dev.name}</p>
                        <p className="text-sm text-muted-foreground">{dev.email}</p>
                        {dev.availability?.headline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dev.availability.headline}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dev.availability?.is_available ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Available
                        </Badge>
                      ) : (
                        <Badge className="bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300 gap-1">
                          <XCircle className="h-3 w-3" />
                          Unavailable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {dev.availability ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {dev.availability.available_hours_per_week}h/week
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dev.skills && dev.skills.length > 0 ? (
                          <>
                            {dev.skills.slice(0, 3).map((skill) => (
                              <Badge key={skill.skill} variant="outline" className="text-xs">
                                {skill.skill}
                                <span className="ml-1 text-muted-foreground">
                                  {skill.proficiency}/5
                                </span>
                              </Badge>
                            ))}
                            {dev.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{dev.skills.length - 3}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">No skills</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        {dev.assigned_projects_count || 0} active
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
