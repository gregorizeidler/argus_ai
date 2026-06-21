'use client'

import {
  Shield, BarChart3, Users, Crown, Activity, Send, GraduationCap,
  Archive, ShieldAlert, CheckCircle, Eye, FileText, MessageSquare,
  AlertTriangle, Search, Upload, Download, Plus, ChevronRight,
  ChevronDown, Settings, Home, ClipboardList, TrendingUp,
  Target, Layers, X, ChevronLeft, MoreHorizontal, Loader2,
  ExternalLink, Sparkles, BookOpen, Scale, Building2, Calendar,
  Clock, Hash, Percent, TriangleAlert, CircleDot, ArrowRight,
  Filter, RefreshCw, Trash2, Edit3, Save, Copy, Printer,
  Handshake, Database, Briefcase, UserCheck,
  PanelLeftClose, PanelLeftOpen, Play, Info, Map, Mic, ScanLine, Cpu, Zap,
  type LucideIcon,
} from 'lucide-react'

export const PILLAR_ICONS: Record<string, LucideIcon> = {
  Shield, BarChart3, Users, Crown, Activity, Send, GraduationCap,
  Archive, ShieldAlert, CheckCircle, Search, Handshake, Database, Briefcase, UserCheck,
}

export {
  Eye, FileText, MessageSquare, AlertTriangle, Search, Upload, Download,
  Plus, ChevronRight, ChevronDown, Settings, Home, ClipboardList,
  TrendingUp, Target, Layers, X, ChevronLeft, MoreHorizontal, Loader2,
  ExternalLink, Sparkles, BookOpen, Scale, Building2, Calendar, Clock,
  Hash, Percent, TriangleAlert, CircleDot, ArrowRight, Filter, RefreshCw,
  Shield, BarChart3, Users, Crown, Activity, Send, GraduationCap,
  Archive, ShieldAlert, CheckCircle, Trash2, Edit3, Save, Copy, Printer,
  Handshake, Database, Briefcase, UserCheck,
  PanelLeftClose, PanelLeftOpen, Play, Info, Map, Mic, ScanLine, Cpu, Zap,
}

type CustomIconProps = React.SVGProps<SVGSVGElement> & { size?: number }

export const Moon = ({ size = 24, ...props }: CustomIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

export const Sun = ({ size = 24, ...props }: CustomIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
