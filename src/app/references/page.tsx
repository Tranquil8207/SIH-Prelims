import type { Metadata } from "next";
import { PageNav } from "@/components/page-nav";

export const metadata: Metadata = {
  title: "References",
};

export default function ReferencesPage() {
  return (
    <main className="dash-page">
      <div className="sheet-head">
        <header className="flow-banner">
          <div className="flow-banner-text">
            <p className="flow-kicker">Bibliography</p>
            <h1>References</h1>
            <p className="flow-lede">
              Supporting literature used by our team to design the physics model and the systems architecture.
            </p>
          </div>
          <PageNav current="/references" />
        </header>
      </div>
      <div className="dash">
        <section className="dash-card refs-list">
          <div className="refs-group">
            <ul className="refs">
              <li>
                G. Woschni, “A universally applicable equation for the instantaneous heat transfer coefficient in
                the internal combustion engine,” SAE Technical Paper 670931, 1967, doi: 10.4271/670931.
              </li>
              <li>
                J. Galindo, H. Climent, B. Plá, and V. D. Jiménez, “Correlations for Wiebe function parameters for
                combustion simulation in two-stroke small engines,” Applied Thermal Engineering, vol. 31, no. 6–7, pp.
                1190–1199, 2011, doi: 10.1016/j.applthermaleng.2010.12.020.
              </li>
              <li>
                M. İ. Karamangil, Ö. Kaynaklı, and A. Sürmen, “Parametric investigation of cylinder and jacket side
                convective heat transfer coefficients of gasoline engines,” Energy Conversion and Management, vol. 47,
                no. 6, pp. 800–816, 2006, doi: 10.1016/j.enconman.2005.05.018.
              </li>
              <li>
                S. Bova, T. Castiglione, R. Piccione, F. Pizzonia, and M. Belli, “Experimental investigation and
                lumped-parameter model of the cooling system of an ICE under nucleate boiling conditions,” Energy
                Procedia, vol. 81, pp. 907–917, 2015, doi: 10.1016/j.egypro.2015.12.145.
              </li>
              <li>
                D. G. Charyulu, G. Singh, and J. K. Sharma, “Performance evaluation of a radiator in a diesel
                engine—a case study,” Applied Thermal Engineering, vol. 19, no. 6, pp. 625–639, 1999, doi:
                10.1016/S1359-4311(98)00064-7.
              </li>
            </ul>
          </div>

          <div className="refs-group">
            <ul className="refs">
              <li>
                D. Feng, K. Buresheid, H. Zhao, H. Wei, and C. Chen, “Investigation of lubricant induced
                pre-ignition and knocking combustion in an optical spark ignition engine,” Proceedings of the
                Combustion Institute, vol. 37, no. 4, pp. 4901–4910, 2019, doi: 10.1016/j.proci.2018.07.061.
              </li>
              <li>
                S. Babu Devasenapati, K. I. Ramachandran, and V. Sugumaran, “Misfire Detection in a Spark Ignition
                Engine using Support Vector Machines,” International Journal of Computer Applications, vol. 5, no. 6,
                pp. 1–5, 2010.
              </li>
              <li>
                H. Schwarze, U. Müller-Frank, L. Brouwer, M. Kopnarski, G. Knoll, S. Emrich, and F. Schlerege,
                “Lubricant Degradation and Wear Behaviour in a Spark-ignition Engine,” MTZ Worldwide, vol. 69, no. 10,
                pp. 60–65, 2008.
              </li>
              <li>
                M. Boudaghi, M. Shahbakhti, and S. A. Jazayeri, “Misfire Detection of Spark Ignition Engines Using
                a New Technique Based on Mean Output Power,” Journal of Engineering for Gas Turbines and Power, vol.
                137, no. 9, p. 091509, 2015, doi: 10.1115/1.4029914.
              </li>
            </ul>
          </div>

          <div className="refs-group">
            <ul className="refs">
              <li>
                Arias Chao, M., Kulkarni, C., Goebel, K. and Fink, O. (2022). Fusing physics-based and deep learning
                models for prognostics. Reliability Engineering & System Safety, 217:107961.
              </li>
              <li>
                Li, G., Xu, T. and Ding, S. (2026). An improved deep autoencoder framework for aviation piston engine
                unsupervised anomaly detection considering the real-life data characteristics. The Aeronautical
                Journal, 130(1350):2636–2661.
              </li>
              <li>
                Yang, H., LaBella, A. and Desell, T. (2022). Predictive maintenance for general aviation using
                convolutional transformers. Proceedings of the AAAI Conference on Artificial Intelligence,
                36(11):12636–12642.
              </li>
              <li>
                Yang, H. and Desell, T. (2022). A large-scale annotated multivariate time series aviation maintenance
                dataset from the NGAFID. arXiv preprint arXiv:2210.07317.
              </li>
              <li>
                Jiang, F., Hou, X. and Xia, M. (2025). Spatio-temporal attention-based hidden physics-informed neural
                network for remaining useful life prediction. Advanced Engineering Informatics, 63:102958.
              </li>
              <li>
                Szrama, S. (2026). Turbofan engine remaining useful life prediction based on physics-aware hybrid
                framework and fatigue cycles. International Journal of Prognostics and Health Management, 17(1).
              </li>
              <li>
                Adhikari, P. P., Mathai, D. V., Sadhu, A. and Macer, D. (2025). Methods and systems for hybrid digital
                twin driven health predictions for aircraft sub-systems. PHM Society Asia-Pacific Conference, 5(1).
              </li>
              <li>
                Huang, X., Yin, F., Fan, C., Li, L., Jin, Z., Wang, K., Fu, Y., Liu, Y. and Zhao, Z. (2025). Piston
                life prediction method based on digital twin and multiphysics field coupling. 2025 3rd International
                Conference on Data Science and Information System (ICDSIS), 1–7.
              </li>
            </ul>
          </div>

          <div className="refs-group">
            <ul className="refs">
              <li>
                Journal of Applied Fluid Mechanics, Vol. 9, No. 2, pp. 573-585, 2016. ISSN 1735-3572, EISSN
                1735-3645. DOI: 10.18869/acadpub.jafm.68.225.24661
              </li>
              <li>
                uyen-Schäfer, H. (2012). Thermodynamics of Turbochargers. In: Rotordynamics of Automotive
                Turbochargers. Springer, Berlin, Heidelberg. https://doi.org/10.1007/978-3-642-27518-0_2
              </li>
              <li>
                Jinlong Liu, Cosmin E. Dumitrescu, Single and double Wiebe function combustion model for a heavy-duty
                diesel engine retrofitted to natural-gas spark-ignition, Applied Energy, Volume 248, 2019, Pages
                95-103, ISSN 0306-2619
              </li>
              <li>
                https://www.flyrotax.com/products/916-is-c
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
