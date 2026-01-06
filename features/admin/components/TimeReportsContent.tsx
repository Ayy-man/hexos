'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Filter, User, FolderKanban, Clock } from 'lucide-react'
import type { DevTimeReport, ProjectTimeReport } from '@/lib/api/admin-reports'

interface Project {
  id: string
  project_name: string
  client_name: string
}

interface Dev {
  id: string
  name: string
  email: string
}

interface TimeReportsContentProps {
  initialDevReports: DevTimeReport[]
  initialProjectReports: ProjectTimeReport[]
  devs: Dev[]
  projects: Project[]
  initialStartDate: string
  initialEndDate: string
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export function TimeReportsContent({
  initialDevReports,
  initialProjectReports,
  devs,
  projects,
  initialStartDate,
  initialEndDate,
}: TimeReportsContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [selectedDev, setSelectedDev] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')

  const devReports = initialDevReports
  const projectReports = initialProjectReports

  // Filter reports based on selection
  const filteredDevReports = selectedDev === 'all'
    ? devReports
    : devReports.filter(r => r.dev_id === selectedDev)

  const filteredProjectReports = selectedProject === 'all'
    ? projectReports
    : projectReports.filter(r => r.project_id === selectedProject)

  const handleApplyFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams()
      params.set('startDate', startDate)
      params.set('endDate', endDate)
      if (selectedDev !== 'all') params.set('devId', selectedDev)
      if (selectedProject !== 'all') params.set('projectId', selectedProject)
      router.push(`/admin/time-reports?${params.toString()}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev">Developer</Label>
              <Select value={selectedDev} onValueChange={setSelectedDev}>
                <SelectTrigger id="dev">
                  <SelectValue placeholder="All developers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All developers</SelectItem>
                  {devs.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleApplyFilters} disabled={isPending} className="w-full">
                {isPending ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="by-dev">
        <TabsList>
          <TabsTrigger value="by-dev" className="gap-2">
            <User className="h-4 w-4" />
            By Developer
          </TabsTrigger>
          <TabsTrigger value="by-project" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            By Project
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-dev" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Developer Time Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDevReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No time logged in this period</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Developer</TableHead>
                      <TableHead>Total Time</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Projects</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevReports.map((report) => (
                      <TableRow key={report.dev_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{report.dev_name}</p>
                            <p className="text-sm text-muted-foreground">{report.dev_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {formatDuration(report.total_minutes)}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.entries_count}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {report.projects.slice(0, 3).map((project) => (
                              <Badge key={project.project_id} variant="outline" className="text-xs">
                                {project.project_name}: {formatDuration(project.minutes)}
                              </Badge>
                            ))}
                            {report.projects.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{report.projects.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-project" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Time Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProjectReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No time logged in this period</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Total Time</TableHead>
                      <TableHead>Developers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjectReports.map((report) => (
                      <TableRow key={report.project_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{report.project_name}</p>
                            <p className="text-sm text-muted-foreground">{report.client_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {formatDuration(report.total_minutes)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {report.devs.map((dev) => (
                              <Badge key={dev.dev_id} variant="outline" className="text-xs">
                                {dev.dev_name}: {formatDuration(dev.minutes)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
