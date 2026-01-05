'use client'

import * as React from 'react'
import { Briefcase, CalendarDays, Clock, Star, Users, Code2, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface ProjectOpportunityProps {
  id: string
  status: 'open' | 'invited' | 'assigned' | 'closed'
  projectName: string
  clientName: string
  clientLogo?: string
  description: string
  estimatedHours: number
  deadline?: string
  techStack: string[]
  complexity: 'low' | 'medium' | 'high'
  matchPercentage?: number
  postedBy: {
    name: string
    avatarUrl?: string
    role: string
  }
  isInvitation?: boolean
  onAccept: () => void
  onDecline: () => void
  className?: string
}

const statusColors = {
  open: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  invited: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  assigned: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
  closed: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-950 dark:text-stone-300 dark:border-stone-800',
}

const complexityColors = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
}

const ProjectOpportunityCard = React.forwardRef<HTMLDivElement, ProjectOpportunityProps>(
  (
    {
      status,
      projectName,
      clientName,
      clientLogo,
      description,
      estimatedHours,
      deadline,
      techStack,
      complexity,
      matchPercentage,
      postedBy,
      isInvitation = false,
      onAccept,
      onDecline,
      className,
    },
    ref
  ) => {
    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
    }

    const statusLabel = {
      open: 'Open',
      invited: 'Invited',
      assigned: 'Assigned',
      closed: 'Closed',
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          'w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm',
          className
        )}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">
              {isInvitation ? 'Project Invitation' : 'New Opportunity'}
            </h2>
          </div>
          <Badge variant="outline" className={cn('border', statusColors[status])}>
            {statusLabel[status]}
          </Badge>
        </div>

        <hr className="my-4 border-border" />

        {/* Project Info */}
        <div className="flex flex-col gap-4">
          {/* Client Info */}
          <div className="flex items-center gap-3">
            {clientLogo ? (
              <img
                src={clientLogo}
                alt={clientName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{projectName}</p>
              <p className="text-sm text-muted-foreground">{clientName}</p>
            </div>
          </div>

          {/* Estimated Hours */}
          <h3 className="text-3xl font-bold tracking-tight">
            {estimatedHours} <span className="text-lg font-normal text-muted-foreground">hrs</span>
          </h3>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {deadline && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>{deadline}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>~{Math.ceil(estimatedHours / 8)} days</span>
            </div>
            {matchPercentage && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {matchPercentage}% Match
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={complexityColors[complexity]}>
              <Code2 className="mr-1 h-3 w-3" />
              {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
            </Badge>
            {techStack.slice(0, 3).map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
            {techStack.length > 3 && (
              <Badge variant="secondary">+{techStack.length - 3}</Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {description}
          </p>
        </div>

        {/* Posted By */}
        <div className="mt-6 flex items-center gap-3">
          {postedBy.avatarUrl ? (
            <img
              src={postedBy.avatarUrl}
              alt={postedBy.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {postedBy.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{postedBy.name}</p>
            <p className="text-xs text-muted-foreground">{postedBy.role}</p>
          </div>
        </div>

        {/* Action Buttons */}
        {status === 'open' || status === 'invited' ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button onClick={onAccept} className="w-full" size="lg">
              {isInvitation ? 'Accept' : 'Apply'}
            </Button>
            <Button onClick={onDecline} variant="outline" className="w-full" size="lg">
              {isInvitation ? 'Decline' : 'Pass'}
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <Badge
              variant="outline"
              className="w-full justify-center py-2 text-muted-foreground"
            >
              {status === 'assigned' ? 'You are assigned to this project' : 'This opportunity is closed'}
            </Badge>
          </div>
        )}
      </motion.div>
    )
  }
)

ProjectOpportunityCard.displayName = 'ProjectOpportunityCard'

export { ProjectOpportunityCard }
