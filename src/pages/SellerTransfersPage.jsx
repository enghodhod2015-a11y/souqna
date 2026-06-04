import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ar-EG')
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount || 0)
}

export default function SellerTransfersPage() {
  const { sellerId } = useParams()
  const navigate = useNavigate()
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sellerName, setSellerName] = useState('')

  useEffect(() => {
    if (sellerId) loadTransfers()
    else navigate('/admin/dashboard')
  }, [sellerId])

  const loadTransfers = async () => {
    try {
      setLoading(true)
      const { data: seller, error: sellerError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', sellerId)
        .single()
      if (sellerError) throw sellerError
      setSellerName(seller.full_name || 'البائع')

      const { data, error } = await supabase
        .from('seller_transfers')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setTransfers(data || [])
    } catch (err) {
      console.error(err)
      toast.error('فشل تحميل الإيصالات')
    } finally {
      setLoading(false)
    }
  }

  const printReceiptAsPDF = (imageUrl, amount, date) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('الرجاء السماح للنوافذ المنبثقة')
      return
    }
    printWindow.document.write(`
      <html dir="rtl">
        <head><title>إيصال تحويل - ${amount} ريال</title></head>
        <body style="text-align:center; font-family:Arial;">
          <h2>إيصال تحويل مالي</h2>
          <p>المبلغ: ${amount} ريال</p>
          <p>التاريخ: ${formatDate(date)}</p>
          <img src="${imageUrl}" style="max-width:100%; border:1px solid #ccc;" />
          <script>
            window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 1000); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const shareReceipt = async (imageUrl, amount, date) => {
    if (navigator.share) {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const file = new File([blob], 'receipt.jpg', { type: blob.type })
        await navigator.share({
          title: 'إيصال تحويل',
          text: `إيصال تحويل بمبلغ ${amount} ريال بتاريخ ${formatDate(date)}`,
          files: [file]
        })
        toast.success('تمت المشاركة')
      } catch (err) {
        console.error(err)
        try {
          await navigator.share({
            title: 'إيصال تحويل',
            text: `إيصال تحويل بمبلغ ${amount} ريال - ${imageUrl}`
          })
          toast.success('تمت مشاركة الرابط')
        } catch (e) {
          toast.error('لا يمكن المشاركة حالياً')
        }
      }
    } else {
      navigator.clipboard.writeText(imageUrl)
      toast.success('تم نسخ رابط الإيصال')
    }
  }

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gold">
          إيصالات التحويل - {sellerName}
        </h1>
        <Button variant="secondary" onClick={() => navigate('/admin/dashboard')}>
          العودة للوحة التحكم
        </Button>
      </div>

      {transfers.length === 0 ? (
        <div className="bg-primary-card p-8 rounded-2xl text-center border border-gold/30">
          <p className="text-text-secondary">لا توجد إيصالات تحويل لهذا البائع</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-primary-card rounded-2xl border border-gold/30">
          <table className="w-full text-right border-collapse">
            <thead className="bg-secondary-blue/50">
              <tr className="border-b border-gold/30">
                <th className="p-3">رقم العملية</th>
                <th className="p-3">تاريخ الإرسال</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">صورة الإيصال</th>
                <th className="p-3">ملاحظة</th>
                <th className="p-3">الإجراءات</th>
               </tr>
            </thead>
            <tbody>
              {transfers.map(rec => (
                <tr key={rec.id} className="border-b border-gold/20 hover:bg-secondary-blue/10">
                  <td className="p-3">{rec.id}</td>
                  <td className="p-3">{formatDate(rec.created_at)}</td>
                  <td className="p-3">{formatCurrency(rec.amount)}</td>
                  <td className="p-3">
                    {rec.receipt_image ? (
                      <a href={rec.receipt_image} target="_blank" className="text-gold underline" rel="noopener noreferrer">
                        عرض الصورة
                      </a>
                    ) : '-'}
                  </td>
                  <td className="p-3">{rec.note || '-'}</td>
                  <td className="p-3 flex gap-2 flex-wrap">
                    {rec.receipt_image && (
                      <>
                        <button
                          onClick={() => printReceiptAsPDF(rec.receipt_image, rec.amount, rec.created_at)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          📄 PDF
                        </button>
                        <button
                          onClick={() => shareReceipt(rec.receipt_image, rec.amount, rec.created_at)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          🔗 مشاركة
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}